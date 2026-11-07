import {
  BookOpen,
  Calculator,
  CalendarCheck,
  ChevronRight,
  Coins,
  Globe,
  Phone,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { SITE, whatsappLink } from "@/lib/site";

import { openShop } from "../lib/shop";
import type { View } from "../lib/views";

/**
 * Everything the bottom bar has no room for.
 *
 * The bar carries the four things somebody opens the app to do. This carries
 * the rest, and the split is deliberate: a tab is for a screen you return to
 * several times in a visit, a drawer entry is for one you go to once and are
 * then finished with. The calculator and the shop's address are both of the
 * second kind — needed, and needed once.
 *
 * Custom Order is not here: it is a tab on the bar, because a customer who
 * came to have something made should not have to find a menu first.
 *
 * Some of these are the app's own screens and some are pages of the website,
 * and the drawer says which: an entry that stays inside the app shows a
 * chevron, one that leaves it says so in its own line underneath. The
 * alternative is a menu where two taps that look identical do very different
 * things, one of them costing a page load on a phone in a bazaar.
 *
 * The app's own screens come first for that reason. Selling gold, the story
 * and contact used to be the second kind and are now the first: all three are
 * things a customer reaches for while standing somewhere with one bar of
 * signal, and all three were a page load away. The full catalogue is still
 * the website, because it has not been built here.
 *
 * Buy-back and exchange is not in this list at all. It is not a page the app
 * is missing: the promise itself is on the Our Story screen, as one of the
 * four standards, and the terms of it come up in the Contact questions. A menu
 * row leading to a third telling of it was one entry too many for a drawer
 * that is read with a thumb.
 *
 * Opening and closing is history, not state — see App.tsx. Android's back
 * button closes this drawer because the drawer is an entry, which is the same
 * arrangement as a piece opened over the grid.
 */
type Entry =
  | { kind: "view"; id: View; label: string; icon: LucideIcon }
  | { kind: "page"; path: string; label: string; icon: LucideIcon };

const ENTRIES: readonly Entry[] = [
  { kind: "view", id: "appointment", label: "Book an appointment", icon: CalendarCheck },
  { kind: "view", id: "calculator", label: "Gold calculator", icon: Calculator },
  { kind: "view", id: "sell", label: "Sell your gold", icon: Coins },
  { kind: "view", id: "store", label: "Our store", icon: Store },
  { kind: "view", id: "story", label: "Our story", icon: BookOpen },
  { kind: "view", id: "contact", label: "Contact", icon: Phone },
  { kind: "page", path: "/collections", label: "Our Website", icon: Globe },
];

type Props = {
  onClose: () => void;
  onView: (view: View) => void;
};

export function SideDrawer({ onClose, onView }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  /*
   * The page underneath stays put while this is open.
   *
   * Without it the drawer scrolls the screen behind it, which on a phone looks
   * like the drawer itself is misbehaving. Restored on the way out rather than
   * set to a fixed value, so a future screen that wants its own overflow rule
   * is not quietly overridden by a drawer that was open once.
   */
  useEffect(() => {
    const held = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = held;
    };
  }, []);

  /* The close button, so a keyboard or a screen reader lands inside the drawer
   * rather than on whatever was focused behind it. */
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/*
        The scrim is a button, not a div with a handler: tapping beside a drawer
        to close it is the gesture everybody already has, and making it a real
        control means it is reachable without one.
      */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close the menu"
        className="page-enter absolute inset-0 bg-primary-deep/70"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="drawer-in relative flex h-full w-[82%] max-w-[320px] flex-col overflow-y-auto bg-ivory shadow-[0_0_40px_oklch(0.16_0.035_160/0.35)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gold/20 px-5 py-5">
          <p className="font-display text-primary uppercase">
            <span className="block text-lg leading-none tracking-[0.2em]">Al-Madina</span>
            <span className="mt-1.5 block text-[9px] leading-none tracking-[0.42em] text-gold-deep">
              Jewellers
            </span>
            <span className="mt-3 block text-[10px] leading-none tracking-widest text-warmgrey normal-case">
              Since {SITE.founded}
            </span>
          </p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close the menu"
            className="card-lift-sm -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/25 bg-white text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="More" className="flex-1 px-3 py-3">
          <ul>
            {ENTRIES.map((entry) => (
              <li key={entry.label}>
                <button
                  type="button"
                  onClick={() => (entry.kind === "view" ? onView(entry.id) : openShop(entry.path))}
                  className="flex w-full items-center gap-3.5 rounded-xl px-2.5 py-3.5 text-left transition-colors active:bg-champagne/40"
                >
                  <entry.icon className="h-[18px] w-[18px] shrink-0 text-gold-deep" aria-hidden />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{entry.label}</span>
                    {entry.kind === "page" ? (
                      <span className="mt-0.5 block text-[10px] tracking-wide text-warmgrey">
                        Opens the website
                      </span>
                    ) : null}
                  </span>
                  {entry.kind === "view" ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-warmgrey" aria-hidden />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/*
          The shop itself at the foot, because the drawer is where somebody
          looks when they have stopped browsing and want to ask a person. The
          address is the shop's own and the WhatsApp number is the one on the
          bills; neither is typed here.
        */}
        <div className="border-t border-gold/20 px-5 py-5">
          <a
            href={whatsappLink("Assalam o Alaikum, I have a question about your jewellery.")}
            className="card-lift-sm flex items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white"
          >
            <WhatsAppIcon className="h-4 w-4" aria-hidden />
            WhatsApp the shop
          </a>

          <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">{SITE.address}</p>
          <p className="nums mt-1.5 text-[11px] leading-relaxed text-warmgrey">
            {SITE.cellNumbers.join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}
