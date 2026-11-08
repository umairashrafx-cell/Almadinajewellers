import { ChevronDown, Scale } from "lucide-react";
import { useState } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { GOLD_WE_BUY, SELL_FAQS, SELL_PAYMENT, SELL_STEPS } from "@/lib/page-copy";
import { BUY_KARAT, formatRateStamp, rateFor, type RateSnapshot } from "@/lib/rates";
import { SITE, formatPKR, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

import { AppLink } from "../components/AppButton";
import type { Cached } from "../lib/cache";

/**
 * Selling gold to the shop, in the app.
 *
 * Until now this was a drawer entry that opened the website — a page load, in
 * a browser, for somebody who is usually standing in a bazaar on a bad
 * connection and wants one number and one answer. Both are here now.
 *
 * The number is the 20K buying rate, which is the whole of what the shop pays
 * and the only figure on this screen. It is the shell's own snapshot, shared
 * with the board and the calculator, so the three can never disagree. There is
 * no calculator here on purpose: the website has one, and an estimate worked
 * out on a phone from a weight nobody has checked is the kind of figure a
 * customer arrives holding and expects to be honoured.
 *
 * The answer is what to bring — the CNIC, which is the one thing that will
 * turn somebody away at the counter if they have left it at home. It is said
 * in the first step and again in the questions.
 *
 * Every word here is the website's own, from page-copy. Nothing about what the
 * shop buys or pays was written for this screen.
 */
export function SellGoldScreen({ rates }: { rates: Cached<RateSnapshot> }) {
  return (
    <div className="px-4 pt-5 pb-10">
      <Intro />
      <BuyingRate rates={rates} />
      <Steps />
      <WhatWeBuy />
      <Payment />
      <Questions />
      <Ask />
    </div>
  );
}

function Intro() {
  return (
    <header>
      <p className="text-[10px] font-semibold tracking-[0.3em] text-gold-deep uppercase">
        Sell your gold
      </p>
      <h1 className="font-display mt-2.5 text-2xl leading-tight text-primary">
        Tested, weighed in front of you, paid the same day
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-warmgrey">
        Bring your gold and your CNIC to the shop in Sarafa Market. No appointment is needed, and
        there is no obligation to sell.
      </p>
    </header>
  );
}

/**
 * What the shop pays today.
 *
 * 20K, because that is the rate jewellery is bought at however it is stamped,
 * and printing the 22K selling rate beside it would invite the subtraction
 * that the last line answers instead. An unpublished rate says so rather than
 * showing a dash: a customer deciding whether to make the trip is better told
 * to ask than left to read a gap.
 */
function BuyingRate({ rates }: { rates: Cached<RateSnapshot> }) {
  const snapshot = rates.data;
  const buying = rateFor(snapshot, BUY_KARAT);

  return (
    <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-warmgrey uppercase">
            Today&rsquo;s buying rate
          </p>
          <p className="font-display nums mt-2 text-2xl text-primary">
            {buying ? formatPKR(buying.perTola) : "Ask at the shop"}
          </p>
          <p className="mt-1 text-xs text-warmgrey">
            {BUY_KARAT}, per tola &mdash; what we pay for jewellery
          </p>
        </div>

        {buying ? (
          <span className="rounded-full bg-champagne/50 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-gold-deep uppercase">
            {rates.stale ? "Kept" : "Live"}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">
        {snapshot
          ? `Published ${formatRateStamp(snapshot)}. `
          : "The board has not reached this phone yet. "}
        This is below what we sell at, and the difference is the melting and the making that has to
        be done again before the gold can be sold as jewellery.
      </p>
    </section>
  );
}

/** The five steps, numbered, in the order they happen at the counter. */
function Steps() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-primary">How it works</h2>

      <ol className="mt-4 space-y-0 border-l border-gold/30 pl-7">
        {SELL_STEPS.map((step, i) => (
          <li key={step.title} className="relative pb-6 last:pb-0">
            <span
              aria-hidden
              className="nums absolute top-0 -left-[34px] grid h-[22px] w-[22px] place-items-center rounded-full bg-gold text-[11px] font-bold text-primary"
            >
              {i + 1}
            </span>
            <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-warmgrey">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * What the shop buys.
 *
 * Two columns of plain cards, no icons. The website gives each of these a
 * drawn icon of the piece; at this width an icon would be about the size of
 * the word beside it and would earn none of the room it took.
 */
function WhatWeBuy() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-primary">What we buy</h2>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {GOLD_WE_BUY.map((item) => (
          <li
            key={item.title}
            className="card-lift-sm rounded-xl border border-gold/15 bg-white px-3.5 py-3"
          >
            <p className="text-[13px] font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-warmgrey">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Payment() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-primary">How you are paid</h2>

      <ul className="mt-4 space-y-2.5">
        {SELL_PAYMENT.map((way) => (
          <li
            key={way.title}
            className="card-lift-sm rounded-xl border border-gold/15 bg-white px-4 py-3.5"
          >
            <p className="text-[13px] font-semibold text-ink">{way.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-warmgrey">{way.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-warmgrey">
        You choose once the figure is agreed &mdash; walking in commits you to none of them.
      </p>
    </section>
  );
}

/** One open at a time, like the markets board: a screen that is already long
 *  should not be able to double in length while somebody is reading it. */
function Questions() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-primary">Before you come</h2>

      <ul className="mt-4 divide-y divide-gold/15 overflow-hidden rounded-xl border border-gold/15 bg-white">
        {SELL_FAQS.map((faq) => {
          const isOpen = open === faq.q;
          const panelId = `sell-faq-${faq.q.replace(/\W+/g, "-").toLowerCase()}`;

          return (
            <li key={faq.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((current) => (current === faq.q ? null : faq.q))}
                className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left active:bg-champagne/30"
              >
                <span className="text-[13px] leading-snug font-medium text-ink">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-warmgrey transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <p id={panelId} className="px-4 pb-4 text-[13px] leading-relaxed text-warmgrey">
                  {faq.a}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The way out of the screen.
 *
 * WhatsApp rather than a form. Somebody who has read this far either sets off
 * for the shop or wants to check one thing first, and the second of those is a
 * message, not an enquiry with a subject line.
 */
function Ask() {
  return (
    <section className="card-lift mt-8 rounded-2xl border border-gold/15 bg-champagne/25 p-5">
      <h2 className="font-display flex items-center gap-2 text-lg text-primary">
        <Scale className="h-4 w-4 text-gold-deep" aria-hidden />
        Not sure what you have?
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-warmgrey">
        Send a photograph on WhatsApp and we will tell you whether it is worth the trip. A figure
        can only be agreed at the counter, once the piece has been tested and weighed.
      </p>

      <AppLink
        href={whatsappLink("Assalam o Alaikum, I would like to sell some gold jewellery.")}
        className="mt-4 bg-[#25D366] text-white"
        variant="quiet"
      >
        <WhatsAppIcon className="h-4 w-4" aria-hidden />
        Ask on WhatsApp
      </AppLink>

      <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">{SITE.address}</p>
    </section>
  );
}
