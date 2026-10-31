import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import type { Product } from "@/data/products";
import { fetchAllProducts, searchProducts } from "@/lib/catalogue";
import { formatGrams, formatPKR, productEnquiryLink, productUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

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
    window.history.pushState({ piece: piece.sku }, "");
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
      <Kept stale={pieces.stale} loading={pieces.loading} refresh={pieces.refresh} />

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">The pieces</h1>
      <div className="hairline mt-5 max-w-24" />

      {all.length === 0 ? (
        <Empty refresh={pieces.refresh} />
      ) : (
        <>
          <Find query={query} setQuery={setQuery} />

          <Filters categories={categories} category={category} setCategory={setCategory} />

          {shown.length === 0 ? (
            <NothingMatches query={query} />
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
    <label className="mt-6 flex items-center gap-3 border border-gold/30 bg-white/70 px-3 py-2.5">
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
    <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
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
        "shrink-0 border px-3 py-1.5 text-[11px] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors",
        active
          ? "border-gold bg-gold text-primary"
          : "border-gold/35 text-warmgrey hover:border-gold/60",
      )}
    >
      {children}
    </button>
  );
}

function Tile({ piece, onOpen }: { piece: Product; onOpen: () => void }) {
  const price = piece.salePricePkr ?? piece.pricePkr;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col border border-gold/25 bg-white/70 text-left transition-colors hover:border-gold/60"
      >
        <span className="relative block aspect-square w-full overflow-hidden bg-champagne/40">
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
            <span className="absolute top-2 left-2 bg-primary/90 px-2 py-1 text-[9px] font-semibold tracking-widest text-ivory uppercase">
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
    </li>
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-grid h-9 w-9 place-items-center border border-gold/40 text-gold-deep transition-colors hover:bg-gold hover:text-primary"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="px-4 pt-5 pb-12">
        <div className="aspect-square w-full overflow-hidden bg-champagne/40">
          <img
            src={piece.images[0]}
            alt={piece.name}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        </div>

        <h2 className="mt-5 font-display text-2xl leading-snug font-light tracking-wide text-primary">
          {piece.name}
        </h2>
        <p className="mt-1 text-[11px] tracking-widest text-warmgrey uppercase">{piece.sku}</p>

        <p className="mt-4 text-xl font-semibold text-ink">{formatPKR(price)}</p>
        {piece.salePricePkr ? (
          <p className="mt-1 text-sm text-warmgrey line-through">{formatPKR(piece.pricePkr)}</p>
        ) : null}

        <dl className="mt-6 divide-y divide-gold/15 border-y border-gold/15 text-sm">
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

        <div className="mt-6 grid gap-3">
          <ActionButton
            onClick={() => onShop(`/products/${piece.slug}`)}
            className="w-full justify-center"
          >
            See it in the shop
          </ActionButton>

          {/*
            The enquiry is the same WhatsApp message the website's product page
            sends, carrying the piece's own link, so a reply from the shop reads
            the same whichever half of the app it was asked from.
          */}
          <a
            href={productEnquiryLink(piece.name, piece.sku, productUrl(piece.slug))}
            className="inline-flex w-full items-center justify-center gap-2 border border-gold px-7 py-3.5 text-[12px] font-semibold tracking-widest text-ink uppercase transition-colors hover:bg-champagne/50"
          >
            Ask about this piece
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="text-[11px] tracking-widest text-warmgrey uppercase">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

function Waiting() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <p className="text-sm tracking-widest text-warmgrey uppercase">Fetching the pieces…</p>
    </div>
  );
}

function NothingMatches({ query }: { query: string }) {
  return (
    <p className="mt-10 text-center text-sm leading-relaxed text-warmgrey">
      Nothing here matches {query.trim() ? <q>{query.trim()}</q> : "that"}. The whole catalogue is
      in the shop, and the search there looks wider.
    </p>
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
        <ActionButton onClick={refresh}>Try again</ActionButton>
      </div>
    </div>
  );
}
