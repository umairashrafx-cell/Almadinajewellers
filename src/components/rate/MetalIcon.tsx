import jewelleryIcon from "@/assets/rate-icons/jewellery.png";
import pathorIcon from "@/assets/rate-icons/pathor.png";
import pieceIcon from "@/assets/rate-icons/piece.png";
import silverIcon from "@/assets/rate-icons/silver.png";

/**
 * The mark on each rate card's medallion.
 *
 * Chosen by karat rather than by position, so re-ordering the board or adding
 * a metal cannot quietly hand a row the wrong picture.
 *
 * These arrived as artwork with their own colours — yellow bullion, a coral
 * pendant, grey silver — which is why the disc behind them is cream rather
 * than the gold it was when the marks were line drawings taking the disc's own
 * colour. Yellow on gold is a smudge at forty pixels.
 */
const ICONS: Record<string, { src: string; alt: string }> = {
  "24K": { src: pieceIcon, alt: "" },
  "23.65K": { src: pathorIcon, alt: "" },
  "22K": { src: jewelleryIcon, alt: "" },
  "999": { src: silverIcon, alt: "" },
};

export function MetalIcon({ karat, className }: { karat: string; className?: string | undefined }) {
  const icon = ICONS[karat] ?? ICONS["24K"]!;

  return (
    <img
      src={icon.src}
      // Decorative: the card names the metal in text beside it, and a screen
      // reader announcing "gold bars" before "Gold Piece" is noise.
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      width={192}
      height={192}
      className={className}
    />
  );
}
