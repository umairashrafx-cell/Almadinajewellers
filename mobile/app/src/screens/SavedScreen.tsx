import { Heart } from "lucide-react";

import { ActionButton } from "@/components/ui/ActionButton";
import type { Product } from "@/data/products";
import { useWishlist } from "@/hooks/use-wishlist";
import { fetchProductsBySkus } from "@/lib/catalogue";
import { formatPKR } from "@/lib/site";

import { Kept } from "../components/Kept";
import { SAVED_KEY, savedSkus, useCached } from "../lib/cache";
import { openShop } from "../lib/shop";

/**
 * The pieces somebody has kept.
 *
 * Saving happens wherever the pieces are: the heart on a card on the website,
 * or the heart on the Pieces screen next door. Both of them write Capacitor
 * Preferences, which is the one store the app's own screens and the website
 * can both see, and a removal here writes it too — so the two halves cannot
 * disagree about a list they both read from one place. src/lib/wishlist.ts
 * carries the reasoning, and why Preferences rather than a merge of two lists.
 *
 * This screen used to be read-only, and said so: with the list kept in each
 * origin's own localStorage there were two of it, and a removal in one place
 * would have been undone by the other. There is one list now, so taking a
 * piece off it belongs here, where somebody is looking at it.
 *
 * The pieces themselves are fetched for the SKUs that list holds, priced at
 * the day's rate, and kept on the phone so they can be shown in a shop with no
 * signal — which is where somebody actually needs them.
 */
export function SavedScreen({ showPieces }: { showPieces: () => void }) {
  const { has, toggle, ready } = useWishlist();

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

  const fetched = saved.data ?? [];

  /*
   * What was fetched, less whatever has been removed since.
   *
   * The fetch asks the saved list what to look up, so what came back was right
   * when it was asked for; filtering against the live list is what makes a
   * heart tapped here empty the row at once instead of on the next visit.
   *
   * Only once that list is the real one, though. Reading Preferences is
   * asynchronous inside the app, and filtering against a list that has not
   * arrived yet would blank the screen for a moment and announce that nothing
   * is saved — which is the one thing it must not say wrongly.
   */
  const pieces = ready ? fetched.filter((piece) => has(piece.sku)) : fetched;

  return (
    <div className="px-4 pt-6 pb-10">
      <Kept
        stale={saved.stale}
        loading={saved.loading}
        savedAt={saved.savedAt}
        refresh={saved.refresh}
      />

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">Saved pieces</h1>
      <div className="hairline mt-5 max-w-24" />

      {pieces.length === 0 ? (
        <Empty showPieces={showPieces} />
      ) : (
        <>
          <ul className="mt-7 grid gap-4">
            {pieces.map((piece) => (
              <Piece key={piece.sku} piece={piece} onRemove={() => toggle(piece.sku)} />
            ))}
          </ul>
          <p className="mt-8 text-center text-xs leading-relaxed text-warmgrey">
            Prices are worked out against the day&rsquo;s rate and the piece&rsquo;s weight. Tap a
            heart to take a piece off the list.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Nothing kept yet, and somewhere to go about it.
 *
 * The one offer used to be the shop, which is the website: a tap that needs a
 * connection, on a screen whose whole promise is that the saved pieces are
 * there without one. Somebody who opens this in the bazaar on one bar was
 * shown a door that does not open.
 *
 * So the Pieces screen goes first — the app's own catalogue, kept on the
 * phone, with the same hearts — and the shop stays underneath as the wider
 * choice for anybody who does have signal.
 */
function Empty({ showPieces }: { showPieces: () => void }) {
  return (
    <div className="mt-10 border border-gold/30 bg-champagne/20 px-6 py-10 text-center">
      <Heart className="mx-auto h-6 w-6 text-gold-deep" aria-hidden />
      <h2 className="mt-5 font-display text-xl font-light tracking-wide text-primary">
        Nothing saved yet
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-warmgrey">
        Tap the heart on a piece — on the Pieces screen or in the shop — and it will be here, with
        its price at the day&rsquo;s rate, whether or not you have a signal.
      </p>
      <div className="mt-7 grid justify-center gap-3">
        <ActionButton onClick={showPieces}>See the pieces</ActionButton>
        <ActionButton variant="outline" onClick={() => openShop("/collections")}>
          Browse the whole shop
        </ActionButton>
      </div>
    </div>
  );
}

function Piece({ piece, onRemove }: { piece: Product; onRemove: () => void }) {
  const price = piece.salePricePkr ?? piece.pricePkr;
  const weight = piece.pricedWeightG ?? piece.grossWeightG;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => openShop(`/products/${piece.slug}`)}
        className="flex w-full items-center gap-4 border border-gold/25 bg-white/70 p-3 pr-16 text-left transition-colors hover:border-gold/60"
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

      {/*
        Outside the button that opens the piece, because a button inside a
        button is not something a browser will render, and the row keeps a
        right-hand gutter clear so the two tap targets never overlap.

        A filled heart rather than a cross: it is the same gesture as the heart
        that put the piece here, and tapping a filled heart to undo it is what
        it does everywhere else in the app and on the website.
      */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${piece.name} from saved pieces`}
        className="absolute top-1/2 right-3 grid h-11 w-11 -translate-y-1/2 place-items-center border border-gold/40 bg-ivory/90 transition-colors hover:bg-gold"
      >
        <Heart className="h-5 w-5 fill-rose text-rose" strokeWidth={1.4} aria-hidden />
      </button>
    </li>
  );
}
