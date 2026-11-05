/**
 * The wishlist: which pieces somebody has kept, and where that list lives.
 *
 * A module-level store rather than a context, so every card, the header count
 * and the detail page stay in step without a provider around them. React binds
 * to it through useSyncExternalStore in hooks/use-wishlist.ts; nothing in this
 * file knows about React, which is also what makes it testable.
 *
 * Where the list is kept depends on where the code is running:
 *
 * In a browser it is localStorage, and that is the whole story.
 *
 * Inside the Android app it is Capacitor Preferences. The app is two origins
 * in one WebView — the bundled screens on https://localhost and the website on
 * www.almadinajeweller.com — and two origins cannot read each other's
 * localStorage, so a heart tapped on one half was invisible to the other.
 * Preferences belongs to the app rather than to an origin, so it is the one
 * place both halves can see, and inside the app it is the source of truth:
 * each half writes both, and believes Preferences on load.
 *
 * It has to be the source of truth rather than one of two lists merged
 * together. A union of the two would make removal impossible — a piece taken
 * off the list on the website would still be in the other half's localStorage
 * and would come back on the next load, forever. Letting Preferences win is
 * what makes a removal stick. It is safe to let it win because the two halves
 * are never live at once: they are separate page loads, so only one of them
 * ever holds state, and it read Preferences when it started.
 */
const KEY = "amj:wishlist";

export type Wishlist = {
  skus: string[];
  /**
   * Whether the list above is the real one yet.
   *
   * In a browser this is true almost at once. Inside the app the real list
   * comes from Preferences, which is asynchronous, so until it answers the
   * list is only this origin's best guess — and a screen that would otherwise
   * announce "nothing saved" should wait rather than say something wrong.
   */
  ready: boolean;
};

/**
 * The same object for the server render and for the first client render, so
 * hydration compares identical snapshots and React does not re-render for a
 * change that has not happened.
 */
const BLANK: Wishlist = { skus: [], ready: false };

let state: Wishlist = BLANK;
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * How many times the list has been written since the page loaded.
 *
 * The read of Preferences takes a moment, and a heart tapped inside that
 * moment would otherwise be undone by a read that began before it. The hydrate
 * notes this counter before it starts and drops its own result if the number
 * moved, because a tap is newer than a read that predates it.
 */
let writes = 0;

function parse(raw: string | null): string[] | null {
  if (raw === null) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return value.filter((sku): sku is string => typeof sku === "string");
  } catch {
    return null;
  }
}

function readLocal(): string[] {
  try {
    return parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    // Private-mode localStorage throws on access. An empty wishlist is fine.
    return [];
  }
}

function writeLocal(skus: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(skus));
  } catch {
    // Nothing to do; the in-memory list still works for this session.
  }
}

/**
 * Preferences, but only inside the app, and only looked up once.
 *
 * Both imports are dynamic so a browser never pays for a plugin it has no use
 * for. null covers every way of not having one — a browser, or an import that
 * failed — because they come to the same thing here: localStorage is all there
 * is, which is what this hook did before Preferences entered the picture.
 */
async function resolvePreferences() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;

    const { Preferences } = await import("@capacitor/preferences");

    /*
     * Wrapped, and that wrapper is the whole point.
     *
     * Capacitor's plugin objects are Proxies that turn any property read into
     * a call to a native method of that name. Returning one straight out of an
     * async function hands it to the promise machinery, which asks every
     * resolved value whether it is a thenable — and that read of `.then` became
     * a native call, so Android answered
     *
     *     "Preferences.then()" is not implemented on android
     *
     * and this lookup rejected. Both callers catch and carry on with
     * localStorage, so nothing broke loudly: the app simply stopped writing the
     * one store both halves can see, and the wishlist went back to being
     * per-origin without a word. It passed every test and every browser check,
     * because a browser returns null above before it ever touches the proxy,
     * and only showed up in logcat on a device.
     *
     * A plain object is not thenable, so the plugin travels inside one.
     */
    return { plugin: Preferences };
  } catch {
    return null;
  }
}

let resolving: ReturnType<typeof resolvePreferences> | undefined;

/** The one lookup, shared by the hydrate and by every write after it. */
function preferences() {
  resolving ??= resolvePreferences();
  return resolving;
}

function same(a: string[], b: string[]) {
  return a.length === b.length && a.every((sku, i) => sku === b[i]);
}

function publish(next: Wishlist) {
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Preferences writes, queued one behind another.
 *
 * Each write used to start its own chain. Two hearts tapped in quick
 * succession then raced, and whichever `set` happened to settle last decided
 * what the other half of the app would read — which need not be the later tap.
 * A queue makes the last tap the last write.
 */
let writing: Promise<void> = Promise.resolve();

function queueWrite(skus: string[]) {
  writing = writing.then(async () => {
    try {
      const prefs = await preferences();
      if (!prefs) return;
      await prefs.plugin.set({ key: KEY, value: JSON.stringify(skus) });
    } catch {
      // Inside the app this is the copy the other half reads, so losing it
      // means the two disagree until the next change. Still not worth
      // interrupting anybody over: the list in front of them is correct.
    }
  });
}

function save(skus: string[]) {
  writeLocal(skus);
  queueWrite(skus);
}

/**
 * Read what was kept, and settle on it.
 *
 * It starts with this origin's localStorage, synchronously, so the hearts are
 * drawn right on the first paint instead of filling in a moment later. Inside
 * the app that is only a guess — the other half may have changed the list
 * since — so Preferences is read straight after and replaces it.
 */
function hydrate() {
  const local = readLocal();
  state = { skus: local, ready: false };

  void (async () => {
    const before = writes;
    let settled = local;

    try {
      const prefs = await preferences();

      if (prefs) {
        const { value } = await prefs.plugin.get({ key: KEY });

        // A heart was tapped while the read was in flight. That tap is newer
        // than a read that started before it, and has already been written to
        // both places, so there is nothing here worth having.
        if (writes !== before) return;

        const stored = parse(value);

        if (stored === null) {
          /*
           * Never written, or written by a version of the app that kept no
           * list — the plugin returns null for a key that is absent, and parse
           * returns null for a value that is not a list of SKUs.
           *
           * This is the one case where what Preferences says is not the
           * answer, and it matters: an absent key cannot mean "everything was
           * removed", so believing it would throw away a list somebody built
           * up on the website before the app had anywhere to put it. Seed it
           * from what this origin kept instead.
           */
          queueWrite(local);
        } else {
          settled = stored;
        }
      }
    } catch {
      // Nothing readable. localStorage was the whole answer anyway, which is
      // what this store worked from before Preferences entered the picture.
    }

    if (same(settled, state.skus)) {
      publish({ skus: state.skus, ready: true });
      return;
    }

    // Put the settled list into this origin's localStorage as well, so the
    // next load's first paint guesses right and nothing flickers.
    writeLocal(settled);
    publish({ skus: settled, ready: true });
  })();
}

export function subscribe(listener: () => void) {
  // The first subscriber pulls the stored list. Reading here rather than at
  // module scope keeps this file importable on the server.
  if (!hydrated) {
    hydrated = true;
    hydrate();
  }
  listeners.add(listener);

  // Another tab of the same origin changed the list. Only the website ever has
  // two of those; inside the app each half is alone on its origin.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    publish({ skus: readLocal(), ready: state.ready });
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function snapshot(): Wishlist {
  return state;
}

/** Empty, and honest about not knowing yet: there is no storage on a server. */
export function serverSnapshot(): Wishlist {
  return BLANK;
}

export function toggle(sku: string) {
  const skus = state.skus;
  const next = skus.includes(sku) ? skus.filter((s) => s !== sku) : [...skus, sku];

  writes += 1;
  save(next);
  // A tap is as settled as the list gets, whatever the hydrate is still doing.
  publish({ skus: next, ready: true });
}
