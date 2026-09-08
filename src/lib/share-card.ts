import type { ProductDetail } from "@/lib/catalogue";
import { RATE_BOARD, formatRateStamp, type RateSnapshot } from "@/lib/rates";
import { SITE, formatGrams, formatPKR } from "@/lib/site";

/**
 * Shareable pictures of the rate and of a piece.
 *
 * The WhatsApp text in lib/share is still the better thing to send one person:
 * it is searchable, it copies, and it costs nothing to load. But a rate that
 * goes to a broadcast list or a status is looked at rather than read, and a
 * monospace block set in WhatsApp's own font is not the shop's face. These draw
 * the same information as a picture the shop would be happy to have forwarded.
 *
 * Drawn on a canvas rather than rendered on a server. Every figure is data the
 * page already holds and the fonts are already loaded, so a server route would
 * only add a second place where the rate is formatted and a second thing to
 * keep in step with the board.
 */

/** The house palette, taken from the hex noted beside each token in styles.css. */
const COLOUR = {
  deep: "#04180F",
  green: "#0B3D2E",
  gold: "#C9A24B",
  champagne: "#E8D9B5",
  ivory: "#FAF7F2",
} as const;

const DISPLAY = '"Cormorant Garamond", Georgia, serif';
const SANS = '"Inter", ui-sans-serif, system-ui, sans-serif';

/** Instagram's feed portrait, which is also the shape that survives a forward. */
export const CARD_W = 1080;
export const CARD_H = 1350;

/**
 * Canvas falls back to a default face for a font the document has not finished
 * loading, which is how a card ends up set in Times. Asking for each face by
 * name first makes the wait explicit.
 */
async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  await Promise.all([
    document.fonts.load('300 74px "Cormorant Garamond"'),
    document.fonts.load('400 46px "Cormorant Garamond"'),
    document.fonts.load('400 22px "Inter"'),
    document.fonts.load('600 46px "Inter"'),
  ]);

  await document.fonts.ready;
}

/**
 * Loads one image for drawing.
 *
 * crossOrigin matters more than it looks: product photographs come from
 * Supabase storage, and drawing a cross-origin image without it taints the
 * canvas, at which point toBlob throws and the card fails at the last step.
 * Storage answers with Access-Control-Allow-Origin, so asking is enough.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That picture could not be loaded."));
    img.src = src;
  });
}

/** object-fit: cover, by hand. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** Letter-spaced capitals, which the wordmark and the small labels use. */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" = "left",
): void {
  const chars = [...text];
  const width =
    chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);

  let cursor = align === "center" ? x - width / 2 : x;

  for (const c of chars) {
    ctx.fillText(c, cursor, y);
    cursor += ctx.measureText(c).width + spacing;
  }
}

/** Breaks a long name across lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function newCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the picture.");

  return { canvas, ctx };
}

/** The masthead both cards share. */
function drawMasthead(ctx: CanvasRenderingContext2D, top: number): void {
  ctx.textAlign = "left";

  ctx.fillStyle = COLOUR.gold;
  ctx.font = `300 62px ${DISPLAY}`;
  tracked(ctx, "AL-MADINA", CARD_W / 2, top, 6, "center");

  ctx.fillStyle = COLOUR.champagne;
  ctx.font = `500 20px ${SANS}`;
  tracked(ctx, "JEWELLERS", CARD_W / 2, top + 40, 10, "center");

  const rule = ctx.createLinearGradient(CARD_W / 2 - 130, 0, CARD_W / 2 + 130, 0);
  rule.addColorStop(0, "rgba(201,162,75,0)");
  rule.addColorStop(0.5, COLOUR.gold);
  rule.addColorStop(1, "rgba(201,162,75,0)");
  ctx.fillStyle = rule;
  ctx.fillRect(CARD_W / 2 - 130, top + 68, 260, 1);
}

/** The footer both cards share. */
function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = "center";

  ctx.fillStyle = COLOUR.gold;
  ctx.font = `400 italic 34px ${DISPLAY}`;
  ctx.fillText(SITE.tagline, CARD_W / 2, CARD_H - 118);

  ctx.fillStyle = "rgba(232,217,181,0.75)";
  ctx.font = `400 22px ${SANS}`;
  tracked(ctx, "ALMADINAJEWELLER.COM", CARD_W / 2, CARD_H - 70, 4, "center");

  ctx.textAlign = "left";
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The picture could not be saved."))),
      "image/jpeg",
      0.92,
    );
  });
}

/**
 * The day's board, as a picture.
 *
 * Per tola is set large with per gram small beneath it, in that order, because
 * tola is what the market quotes and the figure a customer arrives holding.
 */
export async function renderRateCard(snapshot: RateSnapshot): Promise<Blob> {
  await ensureFonts();
  const { canvas, ctx } = newCanvas();

  ctx.fillStyle = COLOUR.deep;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // A warm bloom behind the table, so the flat green does not read as printed.
  const glow = ctx.createRadialGradient(CARD_W / 2, 640, 40, CARD_W / 2, 640, 680);
  glow.addColorStop(0, "rgba(11,61,46,0.95)");
  glow.addColorStop(1, "rgba(4,24,15,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  drawMasthead(ctx, 128);

  ctx.textAlign = "center";

  ctx.fillStyle = COLOUR.ivory;
  ctx.font = `300 74px ${DISPLAY}`;
  ctx.fillText("Today's Gold Rate", CARD_W / 2, 292);

  ctx.fillStyle = COLOUR.champagne;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText("Mandi Bahauddin", CARD_W / 2, 338);

  ctx.fillStyle = "rgba(232,217,181,0.6)";
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText(formatRateStamp(snapshot), CARD_W / 2, 382);

  // The board, in the order the shop reads it out.
  const rows = RATE_BOARD.flatMap((entry) => {
    const rate = snapshot.rates.find((r) => r.karat === entry.karat);
    return rate ? [{ name: String(entry.name), mark: String(entry.mark), rate }] : [];
  });

  /*
   * Spaced to fill the space rather than to a fixed rhythm. Four rows at a
   * tighter pitch left the bottom third of the card empty, which reads as
   * something failing to load rather than as room to breathe.
   */
  const rowH = 158;
  const top = 500;

  rows.forEach((row, i) => {
    const y = top + i * rowH;

    if (i > 0) {
      ctx.fillStyle = "rgba(201,162,75,0.18)";
      ctx.fillRect(96, y - 30, CARD_W - 192, 1);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = COLOUR.ivory;
    ctx.font = `400 46px ${DISPLAY}`;
    ctx.fillText(row.name, 96, y + 28);

    const nameW = ctx.measureText(row.name).width;
    ctx.fillStyle = COLOUR.gold;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText(row.mark, 96 + nameW + 16, y + 28);

    ctx.textAlign = "right";
    ctx.fillStyle = COLOUR.gold;
    ctx.font = `600 46px ${SANS}`;
    ctx.fillText(row.rate.perTola.toLocaleString("en-US"), CARD_W - 96, y + 22);

    ctx.fillStyle = "rgba(232,217,181,0.65)";
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(`${row.rate.perGram.toLocaleString("en-US")} per gram`, CARD_W - 96, y + 60);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(232,217,181,0.55)";
  ctx.font = `400 21px ${SANS}`;
  ctx.fillText("Rates are indicative · Per tola, in Pakistani rupees", CARD_W / 2, CARD_H - 178);

  drawFooter(ctx);
  return toJpeg(canvas);
}

/**
 * One piece, as a picture.
 *
 * The photograph takes the top half and the price sits under it, because the
 * recipient is being shown a thing before being told a number.
 */
export async function renderProductCard(product: ProductDetail, listedPkr: number): Promise<Blob> {
  await ensureFonts();
  const { canvas, ctx } = newCanvas();

  ctx.fillStyle = COLOUR.deep;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  /*
   * The photograph takes a shade over half. Any less and the piece stops being
   * the subject; any more and the price crowds the footer.
   */
  const photoH = 760;
  const first = product.images[0];
  let drew = false;

  if (first) {
    try {
      const img = await loadImage(first);
      drawCover(ctx, img, 0, 0, CARD_W, photoH);
      drew = true;
    } catch {
      // A photograph that will not load is not a reason to withhold the card.
      drew = false;
    }
  }

  if (!drew) {
    ctx.fillStyle = COLOUR.green;
    ctx.fillRect(0, 0, CARD_W, photoH);
  }

  // Carry the photograph into the green rather than cutting it with a hard edge.
  const scrim = ctx.createLinearGradient(0, photoH - 240, 0, photoH);
  scrim.addColorStop(0, "rgba(4,24,15,0)");
  scrim.addColorStop(1, COLOUR.deep);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, photoH - 240, CARD_W, 240);

  // Karat badge, the way the storefront cards carry it.
  ctx.fillStyle = "rgba(4,24,15,0.85)";
  ctx.fillRect(0, 44, 150, 54);
  ctx.fillStyle = COLOUR.champagne;
  ctx.font = `600 24px ${SANS}`;
  tracked(ctx, product.karat, 75, 79, 3, "center");

  ctx.textAlign = "center";
  ctx.fillStyle = COLOUR.ivory;
  ctx.font = `300 62px ${DISPLAY}`;

  const lines = wrap(ctx, product.name, CARD_W - 200).slice(0, 2);
  lines.forEach((line, i) => ctx.fillText(line, CARD_W / 2, photoH + 96 + i * 70));

  const afterName = photoH + 96 + (lines.length - 1) * 70;

  ctx.fillStyle = "rgba(232,217,181,0.8)";
  ctx.font = `400 26px ${SANS}`;
  const spec = [formatGrams(product.grossWeightG), product.stones].filter(Boolean).join(" · ");
  ctx.fillText(spec, CARD_W / 2, afterName + 62);

  ctx.fillStyle = COLOUR.gold;
  ctx.font = `600 62px ${SANS}`;
  ctx.fillText(formatPKR(listedPkr), CARD_W / 2, afterName + 170);

  if (product.salePricePkr && product.salePricePkr < product.pricePkr) {
    const was = formatPKR(product.pricePkr);
    ctx.fillStyle = "rgba(232,217,181,0.6)";
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(was, CARD_W / 2, afterName + 216);

    const w = ctx.measureText(was).width;
    ctx.fillRect(CARD_W / 2 - w / 2, afterName + 207, w, 1);
  }

  drawFooter(ctx);
  return toJpeg(canvas);
}
