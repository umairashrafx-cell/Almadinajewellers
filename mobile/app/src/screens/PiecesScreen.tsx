import { Heart, Search, Share2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import type { Product } from "@/data/products";
import { useWishlist } from "@/hooks/use-wishlist";
import { fetchAllProducts, searchProducts } from "@/lib/catalogue";
import { shareOnWhatsApp } from "@/lib/share";
import { formatGrams, formatPKR, productEnquiryLink, productUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

import { AppButton, AppLink } from "../components/AppButton";
import { Kept } from "../components/Kept";
import { PIECES_KEY, useCached } from "../lib/cache";
import { openShop } from "../lib/shop";

/**
 * The catalogue, as far as a phone with no signal can carry it.
 *
 * The pieces come from the same query the website runs and are priced by the
 * same arithmetic, against the same rate snapshot — nothing here works a price
 * out for itself, because two ideas of what a bangle costs is one too many.
 * The list is kept on the phone afterwards, so the shop's own stock can be
 * shown to a customer standing in the bazaar on one bar of signal.
 *
 * The photographs cannot be kept that way: they are files in the shop's
 * storage, fetched when they are asked for. With no connection the tiles stay
 * where they are and the words carry the screen, which is the part that
 * matters when somebody is asking what a piece weighs.
 *
 * A piece can be kept from here, on the tile or on the piece itself. That
 * heart writes the same list the website's hearts write — Capacitor
 * Preferences, which both halves of the app can see — so a piece saved here
 * shows up on the Saved screen and on the website's own wishlist, and one
 * removed in either place stays removed. src/lib/wishlist.ts has the why.
 */
export function PiecesScreen() {
  const pieces = useCached<Product[]>(PIECES_KEY, fetchAllProducts);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<Product | null>(null);

  /*
   * A piece opened over the grid is a history entry, so Android's back button
   * closes it rather than walking out of the app.
   *
   * The entry is pushed in the handler that opens the piece, not in an effect
   * inside it. An effect runs twice under StrictMode — mount, unmount, mount —
   * and the unwinding half of that pair popped the entry the moment it was
   * pushed, which closed the piece as it opened. Here the push happens once,
   * because a tap happens once.
   */
  const openRef = useRef<Product | null>(null);
  const leaving = useRef(false);
  openRef.current = open;

  useEffect(() => {
    const onPop = () => setOpen(null);
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // Leaving this tab with a piece open: unwind its entry, or the next back
      // press is spent on a screen nobody is looking at. Not when the leaving
      // is a navigation to the website — that is the thing it would cancel.
      if (openRef.current && !leaving.current) window.history.back();
    };
  }, []);

  const openPiece = (piece: Product) => {
    // The screen is named as well as the piece: every entry the app pushes
    // says which screen it belongs to, so a back press is answered by reading
    // the entry landed on. See lib/views.ts.
    window.history.pushState({ view: "pieces", piece: piece.sku }, "");
    setOpen(piece);
  };

  const leaveForShop = (path: string) => {
    leaving.current = true;
    openShop(path);
  };

  const all = useMemo(() => pieces.data ?? [], [pieces.data]);

  /** Categories as the pieces themselves report them, in the order they arrive. */
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const piece of all) if (!seen.includes(piece.category)) seen.push(piece.category);
    return seen;
  }, [all]);

  const shown = useMemo(() => {
    const matching = query.trim() ? searchProducts(all, query) : all;
    return category ? matching.filter((piece) => piece.category === category) : matching;
  }, [all, query, category]);

  if (pieces.loading && !pieces.data) return <Waiting />;

  return (
    <div className="px-4 pt-6 pb-10">
      <Kept
        stale={pieces.stale}
        loading={pieces.loading}
        savedAt={pieces.savedAt}
        refresh={pieces.refresh}
      />

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">The pieces</h1>
      <div className="hairline mt-5 max-w-24" />

      {all.length === 0 ? (
        <Empty refresh={pieces.refresh} />
      ) : (
        <>
          <Find query={query} setQuery={setQuery} />

          <Filters categories={categories} category={category} setCategory={setCategory} />

          {shown.length === 0 ? (
            <NothingMatches
              query={query}
              category={category}
              clear={() => {
                setQuery("");
                setCategory(null);
              }}
            />
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-3">
              {shown.map((piece) => (
                <Tile key={piece.sku} piece={piece} onOpen={() => openPiece(piece)} />
              ))}
            </ul>
          )}

          <p className="mt-8 text-center text-xs leading-relaxed text-warmgrey">
            {shown.length} of {all.length} pieces. Every price is worked out against the day&rsquo;s
            rate and the piece&rsquo;s weight, so it moves with the board.
          </p>
        </>
      )}

      {open ? (
        <Detail piece={open} onClose={() => window.history.back()} onShop={leaveForShop} />
      ) : null}
    </div>
  );
}

function Find({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  return (
    <label className="card-lift-sm mt-6 flex items-center gap-3 rounded-full border border-gold/20 bg-white px-4 py-3">
      <Search className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a piece, a SKU, a karat"
        aria-label="Search the pieces"
        className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-warmgrey focus:outline-none"
      />
    </label>
  );
}

function Filters({
  categories,
  category,
  setCategory,
}: {
  categories: string[];
  category: string | null;
  setCategory: (value: string | null) => void;
}) {
  if (categories.length < 2) return null;

  return (
    /*
     * A scrolling row rather than a wrapping block: the number of categories is
     * the shop's business, not the layout's, and six of them must not push the
     * first piece off the screen.
     */
    <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Chip active={category === null} onClick={() => setCategory(null)}>
        All
      </Chip>
      {categories.map((name) => (
        <Chip key={name} active={category === name} onClick={() => setCategory(name)}>
          {name}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // h-11, not py-1.5: a 28px-tall chip in a row that scrolls sideways is
        // the easiest thing in the app to miss with a thumb, and missing it
        // scrolls the row instead of choosing the category.
        "inline-flex h-11 shrink-0 items-center rounded-full border px-5 text-[11px] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors",
        active
          ? "card-lift-sm border-primary bg-primary text-ivory"
          : "border-gold/25 bg-white text-warmgrey hover:border-gold/60",
      )}
    >
      {children}
    </button>
  );
}

function Tile({ piece, onOpen }: { piece: Product; onOpen: () => void }) {
  const price = piece.salePricePkr ?? piece.pricePkr;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="card-lift flex h-full w-full flex-col overflow-hidden rounded-xl border border-gold/15 bg-white text-left transition-colors hover:border-gold/40"
      >
        <span className="relative block aspect-square w-full overflow-hidden bg-champagne/30">
          <img
            src={piece.images[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
          {piece.isNew ? (
            <span className="absolute top-2 left-2 rounded-full bg-primary/90 px-2.5 py-1 text-[9px] font-semibold tracking-widest text-ivory uppercase">
              New
            </span>
          ) : null}
        </span>

        <span className="flex flex-1 flex-col p-3">
          <span className="line-clamp-2 block font-display text-sm leading-snug font-light tracking-wide text-primary">
            {piece.name}
          </span>
          <span className="mt-1 block text-[10px] tracking-wide text-warmgrey">
            {piece.karat} · {formatGrams(piece.pricedWeightG ?? piece.grossWeightG)}
          </span>
          <span className="mt-auto block pt-2 text-sm font-semibold text-ink">
            {formatPKR(price)}
          </span>
        </span>
      </button>

      <Keep piece={piece} className="absolute top-2 right-2" />
    </li>
  );
}

/**
 * The heart, on a tile or on the piece itself.
 *
 * It sits outside whatever button opens the piece, because a button inside a
 * button is not something a browser will render — the same arrangement the
 * website's product card uses, and for the same reason. Its own 44px target,
 * so at 375px keeping a piece and opening it are not one fumbled tap — 36px
 * was under both Android's 48dp and WCAG's 44, and it sits on top of a tile
 * that is itself a button, which is the worst place in the app to be a few
 * pixels short.
 */
function Keep({ piece, className }: { piece: Product; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(piece.sku);

  return (
    <button
      type="button"
      onClick={() => toggle(piece.sku)}
      aria-label={saved ? `Remove ${piece.name} from saved pieces` : `Save ${piece.name}`}
      aria-pressed={saved}
      className={cn(
        "card-lift-sm grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-white/95 transition-colors hover:bg-gold",
        className,
      )}
    >
      <Heart
        className={cn("h-5 w-5", saved ? "fill-rose text-rose" : "text-primary")}
        strokeWidth={1.4}
        aria-hidden
      />
    </button>
  );
}

/**
 * One piece, over the grid.
 *
 * It knows nothing about history: closing is whatever the screen above says it
 * is, which is a step back, so the cross and Android's own back button are the
 * same gesture and cannot disagree.
 */
function Detail({
  piece,
  onClose,
  onShop,
}: {
  piece: Product;
  onClose: () => void;
  onShop: (path: string) => void;
}) {
  const price = piece.salePricePkr ?? piece.pricePkr;
  const weight = piece.pricedWeightG ?? piece.grossWeightG;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ivory">
      <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3">
        <p className="text-[11px] font-semibold tracking-widest text-warmgrey uppercase">
          {piece.category}
        </p>

        {/*
          The heart beside the cross rather than a third button under the other
          two. The grid behind this panel teaches the gesture on every tile, and
          the actions at the foot are the two that leave the screen — keeping a
          piece does not, so it belongs up here with closing.
        */}
        <div className="flex items-center gap-2">
          <Keep piece={piece} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-white text-gold-deep transition-colors hover:bg-gold hover:text-primary"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 pb-12">
        <Gallery piece={piece} />

        <h2 className="mt-5 font-display text-2xl leading-snug font-light tracking-wide text-primary">
          {piece.name}
        </h2>
        <p className="mt-1 text-[11px] tracking-widest text-warmgrey uppercase">{piece.sku}</p>

        <p className="mt-4 text-xl font-semibold text-ink">{formatPKR(price)}</p>
        {piece.salePricePkr ? (
          <p className="mt-1 text-sm text-warmgrey line-through">{formatPKR(piece.pricePkr)}</p>
        ) : null}

        <dl className="card-lift-sm mt-6 divide-y divide-gold/15 rounded-xl border border-gold/15 bg-white px-4 text-sm">
          <Row label="Karat" value={piece.karat} />
          <Row label="Weight charged" value={formatGrams(weight)} />
          {piece.pricedWeightG && piece.pricedWeightG !== piece.grossWeightG ? (
            <Row label="Gross weight" value={formatGrams(piece.grossWeightG)} />
          ) : null}
          {piece.stones ? <Row label="Stones" value={piece.stones} /> : null}
        </dl>

        <p className="mt-5 text-xs leading-relaxed text-warmgrey">
          The price follows the day&rsquo;s rate. Ask on WhatsApp and the shop will confirm it, the
          making and anything the photograph does not say.
        </p>

        {/*
          WhatsApp leads now. It is what the screen is for — every price on it
          is "ask the shop", and the mockup puts the green button first for the
          same reason. The shop link follows in gold, and sharing is quiet,
          because a customer who wants to send a piece to somebody will look
          for it and a customer who does not should not be asked.
        */}
        <div className="mt-6 grid gap-3">
          {/*
            The enquiry is the same WhatsApp message the website's product page
            sends, carrying the piece's own link, so a reply from the shop reads
            the same whichever half of the app it was asked from.
          */}
          <AppLink href={productEnquiryLink(piece.name, piece.sku, productUrl(piece.slug))}>
            <WhatsAppIcon className="h-4 w-4" />
            Ask about this piece
          </AppLink>

          <AppButton variant="gold" onClick={() => onShop(`/products/${piece.slug}`)}>
            See it in the shop
          </AppButton>

          <AppButton variant="quiet" onClick={() => void share(piece)}>
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </AppButton>
        </div>
      </div>
    </div>
  );
}

/**
 * The photographs, and where you are among them.
 *
 * A snap-scrolling row rather than a carousel with arrows: a thumb already
 * knows what to do with a strip of images on a phone, and arrows would be two
 * more targets on a screen that already carries a heart and a cross. The dots
 * are read-only. They say how many there are and which one this is, which is
 * the whole job, and a piece with one photograph gets none — a single dot is a
 * control that cannot do anything.
 */
function Gallery({ piece }: { piece: Product }) {
  const [index, setIndex] = useState(0);

  /*
   * Distinct photographs only, and this is the line the whole component turns
   * on. A Product always carries two images, but the catalogue fills the
   * second from the first when a piece has only one key — and thirty of the
   * shop's thirty-six pieces have only one. Handed the pair unfiltered, those
   * thirty would get a two-dot pager over the same photograph twice: a
   * promise of a second angle that does not exist.
   */
  const images = useMemo(
    () => piece.images.filter((src, position, all) => all.indexOf(src) === position),
    [piece.images],
  );

  if (images.length === 0) {
    return <div className="aspect-square w-full rounded-xl bg-champagne/30" />;
  }

  return (
    <div>
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-xl bg-champagne/30"
        onScroll={(event) => {
          const strip = event.currentTarget;
          const width = strip.clientWidth;
          if (width > 0) setIndex(Math.round(strip.scrollLeft / width));
        }}
      >
        {images.map((src, position) => (
          <img
            key={src}
            src={src}
            alt={position === 0 ? piece.name : ""}
            className="aspect-square w-full shrink-0 snap-center object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        ))}
      </div>

      {images.length > 1 ? (
        <>
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {images.map((src, position) => (
              <span
                key={src}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  position === index ? "w-4 bg-gold" : "w-1.5 bg-gold/30",
                )}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Photograph {index + 1} of {images.length}
          </p>
        </>
      ) : null}
    </div>
  );
}

/**
 * Hand the piece to whatever the phone shares with.
 *
 * Android's WebView offers the Web Share API, which opens the system sheet and
 * lets somebody send the piece wherever they already talk to the person they
 * are sending it to. Where the API is missing, WhatsApp is the fallback,
 * because that is where this shop's conversations happen anyway.
 */
async function share(piece: Product) {
  const url = productUrl(piece.slug);
  const text = `${piece.name} — Al-Madina Jewellers`;

  if (navigator.share) {
    try {
      await navigator.share({ title: piece.name, text, url });
    } catch {
      // Dismissing the sheet throws exactly as a failure does, and somebody
      // who closed it has not asked to be sent to WhatsApp instead.
    }
    return;
  }

  window.open(shareOnWhatsApp(`${text}\n${url}`), "_blank");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="text-[11px] tracking-widest text-warmgrey uppercase">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

/**
 * The grid's own shape, drawn empty, while the first pieces are fetched.
 *
 * Six tiles rather than a sentence in the middle of a blank screen: a
 * photograph-led grid on a bad connection takes a visible while, and the
 * difference between "coming" and "broken" is whether anything holds the
 * shape of what is coming. It also stops the page jumping when the real tiles
 * land, because the skeleton is the size of a real tile.
 */
function Waiting() {
  return (
    <div className="px-4 pt-6 pb-10" aria-busy="true" aria-live="polite">
      <p className="sr-only">Fetching the pieces</p>

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">The pieces</h1>
      <div className="hairline mt-5 max-w-24" />

      <div className="mt-6 grid animate-pulse grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((tile) => (
          <div
            key={tile}
            className="card-lift overflow-hidden rounded-xl border border-gold/15 bg-white"
          >
            <div className="aspect-square w-full bg-champagne/30" />
            <div className="p-3">
              <div className="h-3.5 w-4/5 rounded bg-champagne/60" />
              <div className="mt-2 h-2.5 w-1/2 rounded bg-champagne/45" />
              <div className="mt-3 h-3.5 w-3/5 rounded bg-champagne/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A search, or a filter, that matched nothing.
 *
 * It used to say one sentence and offer one way out: the shop, which is the
 * website and needs a connection — a dead end on the screen whose whole point
 * is working without one. The way out of a filter is the filter, so that is
 * what is offered first, and it is a button rather than a sentence telling
 * somebody to go and find the chips they scrolled past.
 *
 * It also now says which of the two narrowed things down. "Nothing here
 * matches that" was wrong when the search box was empty and a category chip
 * was doing the hiding, and wrong in the confusing direction: it blamed a
 * search nobody had typed.
 */
function NothingMatches({
  query,
  category,
  clear,
}: {
  query: string;
  category: string | null;
  clear: () => void;
}) {
  const typed = query.trim();

  return (
    <div className="mt-10 text-center">
      <p className="text-sm leading-relaxed text-warmgrey">
        {typed && category ? (
          <>
            Nothing in {category} matches <q>{typed}</q>.
          </>
        ) : typed ? (
          <>
            Nothing here matches <q>{typed}</q>.
          </>
        ) : (
          <>Nothing in {category} is on this phone yet.</>
        )}{" "}
        The whole catalogue is in the shop, and the search there looks wider.
      </p>

      <div className="mt-6 grid justify-center gap-3">
        <AppButton variant="gold" onClick={clear}>
          {typed && category ? "Clear search and filter" : typed ? "Clear the search" : "Show all"}
        </AppButton>
      </div>
    </div>
  );
}

function Empty({ refresh }: { refresh: () => void }) {
  return (
    <div className="mt-10 border border-gold/30 bg-champagne/20 px-6 py-10 text-center">
      <h2 className="font-display text-xl font-light tracking-wide text-primary">
        No pieces on this phone yet
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-warmgrey">
        They arrive the first time the app has a connection, and stay afterwards.
      </p>
      <div className="mt-7">
        <AppButton variant="gold" onClick={refresh}>
          Try again
        </AppButton>
      </div>
    </div>
  );
}
