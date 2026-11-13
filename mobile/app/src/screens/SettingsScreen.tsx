import { Banknote, Bell, Check, Palette, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  pushStatus,
  setPushPreferences,
  type PushPrefs,
  type PushStatus,
  type RateAlertMode,
} from "@/lib/push";
import { cn } from "@/lib/utils";

import { AppButton } from "../components/AppButton";
import { useRate } from "../components/Money";
import type { Foreign } from "../lib/money";
import { updateSettings, useSettings, type Currency, type Theme } from "../lib/settings";

/**
 * The app, the way one customer wants it.
 *
 * Three things, and each is here because it is a real difference between two
 * people holding the same phone: one reads in the dark, one thinks in dollars
 * because the money comes from abroad, and one wants to be told every time the
 * rate moves while another wants one notification a day and no more.
 *
 * It is in the drawer rather than on the bar for the reason the drawer gives
 * for everything in it: a screen somebody goes to once and is then finished
 * with. Every choice takes effect as it is tapped — there is no Save, because
 * a settings screen with a Save button is a settings screen where half the
 * changes are lost to the back button.
 */
export function SettingsScreen() {
  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="font-display text-2xl font-light tracking-wide text-primary">Settings</h1>
      <div className="hairline mt-5 max-w-24" />

      <div className="mt-7 grid gap-6">
        <Notifications />
        <Appearance />
        <Money />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The pieces every section is built from
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card-lift overflow-hidden rounded-2xl border border-gold/15 bg-white">
      <header className="flex items-center gap-3 border-b border-gold/20 px-5 py-4">
        <Icon className="h-[18px] w-[18px] shrink-0 text-gold-deep" aria-hidden />
        <h2 className="font-display text-xl font-light tracking-wide text-primary">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/** The small capitals over a group of choices inside a section. */
function GroupLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="px-5 pt-4 text-[10px] tracking-widest text-warmgrey uppercase">
      {children}
    </p>
  );
}

/** What a section has to say for itself, under its choices. */
function Note({ children, tone = "quiet" }: { children: ReactNode; tone?: "quiet" | "problem" }) {
  return (
    <p
      className={cn(
        "px-5 pb-5 text-xs leading-relaxed",
        tone === "problem" ? "text-destructive" : "text-warmgrey",
      )}
      {...(tone === "problem" ? { role: "alert" } : {})}
    >
      {children}
    </p>
  );
}

type Choice<T extends string> = { id: T; label: string; detail?: string };

/**
 * One of several, as a list of rows.
 *
 * Rows rather than a segmented control, because every choice on this screen
 * needs a sentence saying what it will actually do — "Every change" means
 * nothing until it says how many notifications that is — and a segment has
 * room for one word. Each row is the full width of the card and at least 56px
 * tall, which is a target a thumb cannot miss.
 *
 * Real radio semantics: a screen reader says "Once a day, radio button, 2 of
 * 3, checked", which is the whole of what the row means.
 */
function Choices<T extends string>({
  labelledBy,
  choices,
  value,
  disabled,
  compact,
  onChange,
}: {
  labelledBy: string;
  choices: ReadonlyArray<Choice<T>>;
  value: T;
  disabled?: boolean;
  /**
   * Shorter rows, for a list of eleven. Still 44px, which is the floor for a
   * thumb; a choice with no sentence under it does not need the rest.
   */
  compact?: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="px-2.5 py-2">
      {choices.map((choice) => {
        const chosen = choice.id === value;

        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={disabled}
            onClick={() => {
              if (!chosen) onChange(choice.id);
            }}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-xl px-2.5 text-left transition-colors active:bg-champagne/40 disabled:opacity-60",
              compact && !choice.detail ? "min-h-11 py-2" : "min-h-14 py-3",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                chosen ? "border-gold bg-gold text-primary" : "border-warmgrey/50",
              )}
            >
              {chosen ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{choice.label}</span>
              {choice.detail ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-warmgrey">
                  {choice.detail}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** On or off, for the one setting that is not a choice between several. */
function Switch({
  label,
  detail,
  on,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="px-2.5 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className="flex min-h-14 w-full items-center gap-3.5 rounded-xl px-2.5 py-3 text-left transition-colors active:bg-champagne/40 disabled:opacity-60"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{label}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-warmgrey">{detail}</span>
        </span>

        <span
          aria-hidden
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
            on ? "border-gold bg-gold" : "border-warmgrey/40 bg-warmgrey/15",
          )}
        >
          <span
            className={cn(
              "switch-thumb absolute top-0.5 left-0.5 h-[22px] w-[22px] rounded-full transition-transform",
              on && "translate-x-5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const RATE_CHOICES: ReadonlyArray<Choice<RateAlertMode>> = [
  {
    id: "every",
    label: "Every change",
    detail: "The morning's rates, and again whenever the shop changes a gold rate during the day.",
  },
  {
    id: "daily",
    label: "Once a day",
    detail: "One notification the morning the shop sets the board, with the 24K and 22K rates.",
  },
  { id: "off", label: "Off", detail: "No rate notifications." },
];

/**
 * What the shop may send this phone.
 *
 * First on the screen, because it is the setting with consequences outside the
 * app: the other two change what somebody sees when they choose to look, and
 * this one decides whether their phone lights up on its own.
 *
 * Nothing is switched in the interface until the shop has actually been told.
 * The rows are held still while the answer is on its way, and what they then
 * show is what the shop holds — so a choice that failed on one bar of signal
 * snaps back and says so, rather than sitting there looking chosen while no
 * notification ever arrives. A setting that lies about being on is worse than
 * one that is off.
 */
function Notifications() {
  const [status, setStatus] = useState<PushStatus>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const check = () => {
    void pushStatus()
      .then(setStatus)
      .catch(() => setStatus({ state: "unsupported", prefs: { rate: "off", pieces: false } }));
  };

  useEffect(() => {
    let cancelled = false;

    void pushStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: "unsupported", prefs: { rate: "off", pieces: false } });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const change = async (next: PushPrefs) => {
    setBusy(true);
    setFailed(false);

    try {
      const result = await setPushPreferences(next);
      setStatus({ state: result.state, prefs: result.prefs });
      // Blocked says its own piece below; this line is for a save that should
      // have worked and did not.
      setFailed(result.state === "ready" && !result.saved);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section icon={Bell} title="Notifications">
      {status === undefined ? (
        <p className="px-5 py-5 text-sm text-warmgrey" aria-live="polite">
          Checking this phone&hellip;
        </p>
      ) : status.state === "unsupported" ? (
        <p className="px-5 py-5 text-sm leading-relaxed text-warmgrey">
          Notifications are not available here. They need the app as installed from Google Play, on
          a phone with Google Play services.
        </p>
      ) : status.state === "blocked" ? (
        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-ink">
            Notifications are turned off for this app on your phone.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-warmgrey">
            Open the phone&rsquo;s Settings → Apps → Al-Madina Jewellers → Notifications and allow
            them, then come back here.
          </p>
          <AppButton variant="quiet" className="mt-4" onClick={check}>
            I have allowed them
          </AppButton>
        </div>
      ) : (
        <>
          <GroupLabel id="settings-rate-alerts">Gold rate</GroupLabel>
          <Choices
            labelledBy="settings-rate-alerts"
            choices={RATE_CHOICES}
            value={status.prefs.rate}
            disabled={busy}
            onChange={(rate) => void change({ ...status.prefs, rate })}
          />

          <div className="mx-5 border-t border-gold/15" />

          <Switch
            label="New pieces"
            detail="When the shop adds new pieces to its cases. Never more than once a day."
            on={status.prefs.pieces}
            disabled={busy}
            onChange={(pieces) => void change({ ...status.prefs, pieces })}
          />

          {failed ? (
            <Note tone="problem">
              That could not be saved just now, so nothing has changed. Check the connection and try
              again.
            </Note>
          ) : (
            <Note>
              {busy
                ? "Telling the shop…"
                : "Nothing else is ever sent — no offers. The shop keeps this phone’s notification address and nothing about you."}
            </Note>
          )}
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

const THEME_CHOICES: ReadonlyArray<Choice<Theme>> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "phone", label: "Same as the phone", detail: "Follows the phone’s own light or dark." },
];

function Appearance() {
  const { theme } = useSettings();

  return (
    <Section icon={Palette} title="Appearance">
      <GroupLabel id="settings-theme">Theme</GroupLabel>
      <Choices
        labelledBy="settings-theme"
        choices={THEME_CHOICES}
        value={theme}
        onChange={(next) => updateSettings({ theme: next })}
      />
      <Note>
        This is for the app&rsquo;s own screens. Pages of the website, opened from the menu, keep
        the website&rsquo;s own light appearance.
      </Note>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * The ten, in the order a customer in Mandi Bahauddin would look for them:
 * the dollar, then the Gulf, where most of the town's family abroad earns,
 * then Britain and Europe, then the rest.
 */
const FOREIGN: ReadonlyArray<{ id: Foreign; name: string }> = [
  { id: "USD", name: "US dollar" },
  { id: "SAR", name: "Saudi riyal" },
  { id: "AED", name: "UAE dirham" },
  { id: "QAR", name: "Qatari riyal" },
  { id: "KWD", name: "Kuwaiti dinar" },
  { id: "OMR", name: "Omani rial" },
  { id: "GBP", name: "British pound" },
  { id: "EUR", name: "Euro" },
  { id: "CAD", name: "Canadian dollar" },
  { id: "AUD", name: "Australian dollar" },
];

const CURRENCY_CHOICES: ReadonlyArray<Choice<Currency>> = [
  {
    id: "PKR",
    label: "Pakistani rupees only",
    detail: "What the shop prices and bills in.",
  },
  ...FOREIGN.map(({ id, name }) => ({ id, label: `Rupees, with ${name} · ${id}` })),
];

/**
 * Which money the figures are read in.
 *
 * Every choice but the first is "rupees, with" something, never the
 * something on its own. The shop sells in rupees; a screen that showed only a
 * pound figure would be showing a price nobody can be charged. So the rupee
 * figure never leaves, and the other currency is a line under it.
 *
 * Ten and no more, because each needs a real rate and the server fetches
 * those ten. The dollar is the interbank figure the international board
 * already carries; the other nine are that same dollar crossed with the day's
 * reference rate for each currency, from a dated source. A rate typed into
 * the app would be a made-up number wearing a currency sign.
 *
 * With a currency chosen, the note says what it was worked from, how old it
 * is, and what it is not. When no usable rate is on the phone it says that
 * instead, and every screen quietly shows rupees alone.
 */
function Money() {
  const { currency } = useSettings();
  const rate = useRate();

  return (
    <Section icon={Banknote} title="Currency">
      <GroupLabel id="settings-currency">Show prices in</GroupLabel>
      <Choices
        labelledBy="settings-currency"
        choices={CURRENCY_CHOICES}
        value={currency}
        compact
        onChange={(next) => updateSettings({ currency: next })}
      />

      {currency === "PKR" ? null : rate ? (
        <Note>
          {rate.code === "USD" ? (
            <>
              Converted at{" "}
              <span className="nums font-semibold text-ink">Rs. {paisa(rate.pkr)}</span> to the
              dollar — the interbank rate, taken {taken(rate.dollar.at)}.
            </>
          ) : (
            <>
              Converted at{" "}
              <span className="nums font-semibold text-ink">
                Rs. {paisa(rate.pkr)} to 1 {rate.code}
              </span>{" "}
              — the interbank dollar (Rs. {paisa(rate.dollar.pkr)}, taken {taken(rate.dollar.at)})
              crossed at the reference rate for {onDay(rate.day)}.
            </>
          )}{" "}
          A money changer&rsquo;s rate differs, and the shop bills in rupees: the second figure is a
          guide, not a quotation.
        </Note>
      ) : (
        <Note>
          No recent rate for {currency} has reached this phone, so prices are in rupees only for
          now. It needs a connection, and then it keeps.
        </Note>
      )}
    </Section>
  );
}

/** A rate to the paisa, which is how the interbank dollar is quoted. */
function paisa(pkr: number): string {
  return pkr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The day of a cross, as a date and nothing else: it is a day's rate. */
function onDay(day: string | undefined): string {
  if (!day) return "the day";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** When the rate was taken, in the phone's own time. */
function taken(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
