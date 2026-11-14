import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useEffect, useRef } from "react";

import { shortcutView, type ShortcutView } from "../lib/shortcuts";

/**
 * The app's own native plugin: AppShortcutsPlugin.java, registered in
 * MainActivity. Only ever touched behind isNativePlatform(); in a browser
 * there is nothing behind the name.
 */
type AppShortcuts = {
  takePending(): Promise<{ view?: string | null }>;
  addListener(
    event: "open",
    handler: (data: { view?: string | null }) => void,
  ): Promise<PluginListenerHandle>;
};

const AppShortcuts = registerPlugin<AppShortcuts>("AppShortcuts");

/**
 * Takes the app to the screen a long press on its icon asked for.
 *
 * Renders nothing, like PushHousekeeping beside it, and for the same reason it
 * sits in the shell: the shortcut can arrive whatever screen is showing.
 *
 * Two ways in. An app opened from cold by a shortcut asks once, on mount, which
 * screen it was opened for; the native side has kept the answer until now.
 * An app already open hears about it as an event, because Android hands the
 * running activity the new intent rather than starting another.
 *
 * Every call is made on the plugin directly and never returned out of an async
 * function: a Capacitor plugin is a Proxy that answers a read of `then` as a
 * native method, which is the bug written up in src/lib/push.ts.
 */
export function ShortcutHousekeeping({ show }: { show: (view: ShortcutView) => void }) {
  /*
   * Read through a ref when a shortcut arrives, not captured at mount: the
   * listener goes on once, and moving to a screen is a move from wherever
   * somebody is now.
   */
  const go = useRef(show);
  go.current = show;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let handle: PluginListenerHandle | undefined;

    const open = (value: unknown) => {
      const view = shortcutView(value);
      if (view && !cancelled) go.current(view);
    };

    AppShortcuts.takePending()
      .then((result) => open(result?.view))
      .catch(() => {
        // A build without the native half. The app opens on its usual screen.
      });

    AppShortcuts.addListener("open", (data) => open(data?.view))
      .then((listener) => {
        if (cancelled) void listener.remove();
        else handle = listener;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, []);

  return null;
}
