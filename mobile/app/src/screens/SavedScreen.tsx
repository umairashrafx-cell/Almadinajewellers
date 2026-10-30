import { Heart } from "lucide-react";

import { ActionButton } from "@/components/ui/ActionButton";
import type { Product } from "@/data/products";
import { fetchProductsBySkus } from "@/lib/catalogue";
import { formatPKR } from "@/lib/site";

import { Kept } from "../components/Kept";
import { SAVED_KEY, savedSkus, useCached } from "../lib/cache";
import { openShop } from "../lib/shop";

/**
 * The pieces saved while browsing the shop.
 *
 * The saving happens on the website, where the pieces are — the heart on a
 * product card. That list is mirrored into the app's own storage as it
 * changes, because the website and these screens are different origins and
 * cannot see each other's localStorage. Here it is read back, priced at the
 * day's rate, and kept on the phone so it can be shown in a shop with no
 * signal, which is where somebody actually needs it.
 *
 * Read-only on purpose: the piece is removed where it was saved, one tap away
 * on the website, rather than in two places that can disagree.
 */
export function SavedScreen() {
  const saved = useCached<Product[]>(SAVED_KEY, async () => {
    const skus = await savedSkus();
    return skus.length === 0 ? [] : await fetchProductsBySkus(skus);
  });

  if (saved.loading && !saved.data) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <p className="text-sm tracking-widest text-warmgrey uppercase">Fetching your pieces…</p>
      </div>
    );
  }

  const pieces = saved.data ?? [];

  return (
    <div className="px-4 pb-10 pt-6">
      <Kept stale={saved.stale} loading={saved.loading} refresh={saved.refresh} />

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">Saved pieces</h1>
      <div className="hairline mt-5 max-w-24" />

      {pieces.length === 0 ? (
        <Empty />
      ) : (
        <>
          <ul className="mt-7 grid gap-4">
            {pieces.map((piece) => (
              <Piece key={piece.sku} piece={piece} />
            ))}
          </ul>
          <p className="mt-8 text-center text-xs leading-relaxed text-warmgrey">
            Prices are worked out against the day&rsquo;s rate and the piece&rsquo;s weight. Remove
            a piece where you saved it, on its page in the shop.
          </p>
        </>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-10 border border-gold/30 bg-champagne/20 px-6 py-10 text-center">
      <Heart className="mx-auto h-6 w-6 text-gold-deep" aria-hidden />
      <h2 className="mt-5 font-display text-xl font-light tracking-wide text-primary">
        Nothing saved yet
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-warmgrey">
        Tap the heart on a piece in the shop and it will be here, with its price at the day&rsquo;s
        rate, whether or not you have a signal.
      </p>
      <div className="mt-7">
        <ActionButton onClick={() => openShop("/collections")}>Browse the shop</ActionButton>
      </div>
    </div>
  );
}

function Piece({ piece }: { piece: Product }) {
  const price = piece.salePricePkr ?? piece.pricePkr;
  const weight = piece.pricedWeightG ?? piece.grossWeightG;

  return (
    <li>
      <button
        type="button"
        onClick={() => openShop(`/products/${piece.slug}`)}
        className="flex w-full items-center gap-4 border border-gold/25 bg-white/70 p-3 text-left transition-colors hover:border-gold/60"
      >
        {/*
          The photograph comes from the shop's storage, so with no connection
          there is nothing to draw. The tile keeps its place either way rather
          than letting the row collapse to the height of the text.
        */}
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden bg-champagne/40">
          <img
            src={piece.images[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block font-display text-lg leading-snug font-light tracking-wide text-primary">
            {piece.name}
          </span>
          <span className="mt-1 block text-[11px] tracking-wide text-warmgrey">
            {piece.karat} · {weight} g
          </span>
          <span className="mt-2 block text-sm font-semibold text-ink">{formatPKR(price)}</span>
        </span>
      </button>
    </li>
  );
}
