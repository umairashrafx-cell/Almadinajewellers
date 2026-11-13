import { ArrowRight, BadgeCheck, ChevronRight, Gem, RefreshCcw, Truck } from "lucide-react";
import { useMemo } from "react";

import heroImage from "@/assets/hero-bridal.webp";
import type { Product } from "@/data/products";
import { fetchAllProducts } from "@/lib/catalogue";
import { formatRateStamp, rateFor, type RateSnapshot } from "@/lib/rates";
import { SITE, formatPKR } from "@/lib/site";

import { AppButton } from "../components/AppButton";
import { Approx } from "../components/Money";
import { PIECES_KEY, useCached, type Cached } from "../lib/cache";

/**
 * The front door.
 *
 * Until now the app opened on the rate board, which is right for the customer
 * who taps the icon on the way to the bazaar and wrong for the one who has
 * just installed it. This screen answers both in the order somebody actually
 * wants them: the shop, then today's figure, then what is in the cases.
 *
 * Nothing here fetches anything of its own. The rate snapshot is the shell's,
 * shared with the board and the calculator so the three can never disagree,
 * and the collections are read off the catalogue the Shop tab has already kept
 * on the phone. Opening the app in a basement therefore paints a complete home
 * screen out of what the phone remembers.
 *
 * Every figure and every photograph on it comes from the shop's own data. The
 * one thing written by hand is the headline.
 */
type Props = {
  rates: Cached<RateSnapshot>;
  showRates: () => void;
  showPieces: () => void;
  showCollection: (category: string) => void;
};

const TRUST = [
  { Icon: BadgeCheck, label: "Hallmarked 22K Gold" },
  { Icon: Gem, label: "925 Certified Silver" },
  { Icon: RefreshCcw, label: "Lifetime Buy-Back" },
  { Icon: Truck, label: "Free Insured Delivery" },
] as const;

export function HomeScreen({ rates, showRates, showPieces, showCollection }: Props) {
  const pieces = useCached<Product[]>(PIECES_KEY, fetchAllProducts);

  return (
    <div className="px-4 pt-5 pb-10">
      <Hero onExplore={showPieces} />
      <TodaysRate rates={rates} onOpen={showRates} />
      <Collections pieces={pieces} onOpen={showCollection} onAll={showPieces} />
      <Trust />
    </div>
  );
}

/**
 * The shop, photographed.
 *
 * One of the website's own hero photographs under the house green, which is
 * what makes this read as a shopfront rather than as a banner: the gradient is
 * heavy enough at the foot for the type to sit on the image instead of in a box
 * over it, and the image is the only thing on the screen allowed to be that
 * large.
 */
function Hero({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="card-lift relative overflow-hidden rounded-2xl bg-primary">
      <img
        src={heroImage}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-85"
      />
      {/*
        Two stops rather than a flat wash: the top keeps enough of the
        photograph to be a photograph, and the foot goes dark enough that the
        headline needs no plate behind it.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-primary via-primary/75 to-primary/5"
      />

      <div className="relative px-5 pt-28 pb-6">
        <p className="text-[10px] font-semibold tracking-[0.3em] text-gold uppercase">
          Since {SITE.founded} &middot; Mandi Bahauddin
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight text-ivory">
          Timeless gold,
          <br />
          weighed honestly
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ivory/75">{SITE.tagline}.</p>

        <AppButton variant="gold" onClick={onExplore} className="mt-6">
          Explore the collection
          <ArrowRight className="h-4 w-4" aria-hidden />
        </AppButton>
      </div>
    </section>
  );
}

/**
 * Today's jewellery rate, and a way to the rest of the board.
 *
 * 22K per tola and nothing else. The board carries four metals, three karats
 * and a buying column, and reprinting any of that here would be a second rate
 * table for a customer to compare against the first. This is the one figure the
 * shop is asked for on the phone, with the shop's own publishing stamp under it
 * so a kept figure is never read as a live one.
 */
function TodaysRate({ rates, onOpen }: { rates: Cached<RateSnapshot>; onOpen: () => void }) {
  const snapshot = rates.data;
  const jewellery = rateFor(snapshot, "22K");

  return (
    <section className="card-lift mt-5 rounded-xl border border-gold/15 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-warmgrey uppercase">
            Today&rsquo;s gold rate
          </p>
          <p className="font-display nums mt-2 text-2xl text-primary">
            {jewellery ? formatPKR(jewellery.perTola) : "—"}
          </p>
          {jewellery ? <Approx pkr={jewellery.perTola} className="mt-1 text-xs" /> : null}
          <p className="mt-1 text-xs text-warmgrey">22K Jewellery, per tola</p>
        </div>

        {jewellery ? (
          <span className="rounded-full bg-champagne/50 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-gold-deep uppercase">
            {rates.stale ? "Kept" : "Live"}
          </span>
        ) : null}
      </div>

      {/*
        The stamp, not a guess at one. An empty cache says so rather than
        printing a date under a dash, because a date with no figure beside it
        reads as a figure that failed to load for a moment.
      */}
      <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">
        {snapshot
          ? `Published ${formatRateStamp(snapshot)}`
          : "The board has not reached this phone yet."}
      </p>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gold-deep uppercase"
      >
        See the full board
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

/**
 * What is in the cases, by collection.
 *
 * Built from the catalogue rather than from a list written here, which is the
 * difference between a shortcut that is always right and one that has to be
 * remembered when the shop adds a collection. The name, the count and the
 * photograph are all the collection's own — the photograph being the first
 * piece filed under it, because a collection with pieces in it always has one
 * and a hand-picked tile image would be another thing to keep up to date.
 *
 * Nothing is rendered at all until the catalogue has reached the phone. A row
 * of empty circles under a heading is worse than a screen that is simply
 * shorter on its first run.
 */
function Collections({
  pieces,
  onOpen,
  onAll,
}: {
  pieces: Cached<Product[]>;
  onOpen: (category: string) => void;
  onAll: () => void;
}) {
  const collections = useMemo(() => {
    const held = new Map<string, { name: string; image: string; count: number }>();
    for (const piece of pieces.data ?? []) {
      const seen = held.get(piece.category);
      if (seen) {
        seen.count += 1;
        continue;
      }
      held.set(piece.category, { name: piece.category, image: piece.images[0], count: 1 });
    }
    return [...held.values()];
  }, [pieces.data]);

  if (collections.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-primary">Collections</h2>
        <button
          type="button"
          onClick={onAll}
          className="text-[11px] font-semibold tracking-widest text-gold-deep uppercase"
        >
          See all
        </button>
      </div>

      {/*
        A rail rather than a grid. Nine collections in a grid is most of a
        screen of navigation before anything has been shown; across, it is one
        gesture, and the tile cut off at the edge is what says there is more.
      */}
      <ul className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {collections.map(({ name, image, count }) => (
          <li key={name} className="shrink-0">
            <button
              type="button"
              onClick={() => onOpen(name)}
              className="flex w-[84px] flex-col items-center gap-2 text-center"
            >
              <span className="card-lift-sm grid h-[84px] w-[84px] place-items-center overflow-hidden rounded-full border border-gold/20 bg-white">
                <img src={image} alt="" aria-hidden className="h-full w-full object-cover" />
              </span>
              {/*
                Two lines of room whether the name needs them or not, so
                "Lockets & Chains" does not push its own count half a line
                below every other count in the rail.
              */}
              <span className="flex min-h-[28px] items-start text-[11px] leading-tight font-semibold text-ink">
                {name}
              </span>
              <span className="nums text-[10px] leading-none text-warmgrey">
                {count} {count === 1 ? "piece" : "pieces"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The four promises the website makes, in the website's own words. */
function Trust() {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-3">
      {TRUST.map(({ Icon, label }) => (
        <li
          key={label}
          className="card-lift-sm flex items-start gap-2.5 rounded-xl border border-gold/15 bg-white px-3.5 py-3.5"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
          <span className="text-[11px] leading-snug font-medium text-ink">{label}</span>
        </li>
      ))}
    </ul>
  );
}
