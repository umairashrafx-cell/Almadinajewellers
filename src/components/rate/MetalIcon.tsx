/**
 * The mark on each rate card's medallion.
 *
 * Drawn as line art rather than fetched as pictures. The design these follow
 * uses modelled photographs of bars and rings; a traced imitation of a
 * rendering reads worse at 40px than a clean mark does, and inline SVG costs
 * no request, scales to any screen and takes the medallion's own colour.
 *
 * Chosen by karat rather than by index, so re-ordering the board or adding a
 * metal cannot silently hand a row the wrong symbol.
 */
type Props = { karat: string; className?: string | undefined };

const stroke = {
  fill: "none",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Stacked bullion, for the purest gold on the board. */
function Bars() {
  return (
    <>
      <rect x="4.5" y="13.5" width="7" height="4.5" rx="0.8" {...stroke} />
      <rect x="12.5" y="13.5" width="7" height="4.5" rx="0.8" {...stroke} />
      <rect x="8.5" y="8" width="7" height="4.5" rx="0.8" {...stroke} />
    </>
  );
}

/** Two rings, for the alloy the shop calls pathor. */
function Rings() {
  return (
    <>
      <circle cx="9.5" cy="14" r="4.6" {...stroke} />
      <circle cx="15" cy="10.5" r="3.8" {...stroke} />
    </>
  );
}

/** A collar with a drop, for the jewellery rate. */
function Necklace() {
  return (
    <>
      <path d="M5 7.5a7.5 7.5 0 0 0 14 0" {...stroke} />
      <circle cx="12" cy="16.5" r="2.6" {...stroke} />
    </>
  );
}

/** Sterling bars, for silver. */
function SilverBars() {
  return (
    <>
      <rect x="4" y="13" width="8" height="5" rx="0.8" {...stroke} />
      <rect x="12" y="9" width="8" height="5" rx="0.8" transform="rotate(-8 16 11.5)" {...stroke} />
    </>
  );
}

const MARKS: Record<string, () => React.JSX.Element> = {
  "24K": Bars,
  "23.65K": Rings,
  "22K": Necklace,
  "999": SilverBars,
};

export function MetalIcon({ karat, className }: Props) {
  const Mark = MARKS[karat] ?? Bars;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      // Decorative: the card already names the metal in text beside it, and a
      // screen reader announcing "gold bars" before "Gold Piece" is noise.
      aria-hidden="true"
      focusable="false"
    >
      <Mark />
    </svg>
  );
}
