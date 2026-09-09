import rateCardBackground from "@/assets/hero-bridal.jpg";
import brandLockup from "@/assets/brand/logo-stacked-on-light.svg";
import jewelleryIcon from "@/assets/rate-icons/jewellery.png";
import pathorIcon from "@/assets/rate-icons/pathor.png";
import pieceIcon from "@/assets/rate-icons/piece.png";
import silverIcon from "@/assets/rate-icons/silver.png";
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

/*
 * Drawn at twice the nominal size and left to be shrunk.
 *
 * Everything below works in 1080x1350 coordinates; the canvas is 2160x2700 and
 * scaled once, so no measurement has to change. It matters because the picture
 * is almost never seen at its own size: WhatsApp re-encodes what it is given,
 * and a phone displays it on a screen with two or three device pixels to each
 * of ours. Handing that pipeline a 1x image is what makes the small type go
 * soft — the loss happens before the picture ever reaches the recipient.
 */
const SCALE = 2;

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

/**
 * object-fit: cover, by hand.
 *
 * `shiftX` slides the crop. The background photograph has its necklace dead
 * centre, which a centred crop puts directly behind the panel; pushing it right
 * is what lets the jewellery sit beside the figures instead of under them.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  shiftX = 0,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2 + shiftX, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/**
 * Letter-spaced capitals, which the wordmark and the small labels use.
 *
 * Native letterSpacing where the browser has it, which is everywhere current.
 * The hand-rolled version underneath places one glyph at a time, and that
 * throws away the font's own kerning and its idea of how wide a space is: the
 * subtitle came out as "MANDIBAHAUDD IN" — the word gap crushed and a false one
 * opened mid-word. The browser knows how to space a string; it only needed
 * telling by how much.
 */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" = "left",
): void {
  /*
   * Asked without narrowing: the DOM types already declare letterSpacing, so
   * `"letterSpacing" in ctx` convinces the compiler the fallback below is
   * unreachable — while older Safari, which is the reason it exists, does not
   * implement it.
   */
  const spacedByBrowser = typeof (ctx as { letterSpacing?: unknown }).letterSpacing === "string";

  if (spacedByBrowser) {
    const previousSpacing = ctx.letterSpacing;
    const previousAlign = ctx.textAlign;

    ctx.letterSpacing = `${spacing}px`;
    ctx.textAlign = align === "center" ? "center" : "left";
    // Canvas trails the gap after the final letter too, so a centred string
    // sits half a gap to the right of where it belongs.
    ctx.fillText(text, align === "center" ? x - spacing / 2 : x, y);

    ctx.letterSpacing = previousSpacing;
    ctx.textAlign = previousAlign;
    return;
  }

  const chars = [...text];
  const width =
    chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);

  let cursor = align === "center" ? x - width / 2 : x;

  for (const c of chars) {
    ctx.fillText(c, cursor, y);
    cursor += ctx.measureText(c).width + spacing;
  }
}

/** What `tracked` will occupy, so a row of tracked words can be laid out. */
function trackedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  const spacedByBrowser = typeof (ctx as { letterSpacing?: unknown }).letterSpacing === "string";

  if (spacedByBrowser) {
    const previous = ctx.letterSpacing;
    ctx.letterSpacing = `${spacing}px`;
    const width = ctx.measureText(text).width;
    ctx.letterSpacing = previous;
    return width;
  }

  const chars = [...text];
  return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
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
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the picture.");

  ctx.scale(SCALE, SCALE);
  ctx.textRendering = "geometricPrecision";

  return { canvas, ctx };
}

/** The footer the product card closes with. */
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

/** A rounded rectangle path, written out because older Safari lacks roundRect. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A small diamond, used to break a panel's sections. */
function ornament(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  colour: string = COLOUR.gold,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = colour;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

/**
 * The light palette the rate card is drawn in.
 *
 * The brand gold cannot carry small text here. Measured against cream it comes
 * to 2.4:1 — on a dark ground it had contrast to spare, and the same gold on
 * cream does not. So gold does the metalwork: rules, borders, medallions and
 * the frame, where contrast is decoration rather than legibility. Everything
 * anybody has to read is deep green.
 */
const LIGHT = {
  ivory: "#FAF7F2",
  cream: "#F7F0E4",
  champagne: "#F2E7D4",
  panel: "#FFFDFA",
  green: "#0B3D2E",
  greenDeep: "#08301F",
  greenSoft: "#4A5F55",
  bronze: "#8A6A18",
  gold: "#C9A24B",
} as const;

/**
 * A bar of gold, as a gradient.
 *
 * Flat gold looks like mustard. Real gold is only ever a set of reflections,
 * so the ramp runs light to deep and back — that alternation is what the eye
 * reads as metal rather than as a colour.
 */
function goldLeaf(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#E3C378");
  g.addColorStop(0.22, "#F6E7B4");
  g.addColorStop(0.45, "#C9A24B");
  g.addColorStop(0.68, "#F2E0A6");
  g.addColorStop(0.85, "#B8912F");
  g.addColorStop(1, "#8A6A18");
  return g;
}

/**
 * The disc each rate sits on.
 *
 * Cream with a gold ring rather than a gold face. When the marks were drawn in
 * the metal's own colour a gold disc was right; the artwork that replaced them
 * carries its own — yellow bullion, a coral pendant — and yellow on gold is a
 * smudge. The ring keeps the metal in the frame, where it costs no legibility.
 */
function medallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const face = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  face.addColorStop(0, "#FFFFFF");
  face.addColorStop(1, "#F4EEE1");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = goldLeaf(ctx, cx - r, cy - r, cx + r, cy + r);
  ctx.stroke();
}

/** The artwork for each metal, by karat rather than by position. */
const METAL_ICON: Record<string, string> = {
  "24K": pieceIcon,
  "23.65K": pathorIcon,
  "22K": jewelleryIcon,
  "999": silverIcon,
};

/**
 * Loads the four marks once, together.
 *
 * They are bundled with the site, so they are same-origin and cannot taint the
 * canvas. A mark that will not load is simply left out: an empty disc is a
 * smaller loss than no card.
 */
async function loadMetalIcons(): Promise<Record<string, HTMLImageElement>> {
  const entries = await Promise.all(
    Object.entries(METAL_ICON).map(async ([karat, src]) => {
      try {
        return [karat, await loadImage(src)] as const;
      } catch {
        return null;
      }
    }),
  );

  return Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null));
}

/** A rising bar chart, for the title banner. */
function iconRising(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = goldLeaf(ctx, x, y + s, x + s, y);
  [0.42, 0.66, 0.92].forEach((h, i) => {
    ctx.fillRect(x + i * s * 0.3, y + s * (1 - h), s * 0.2, s * h);
  });

  ctx.strokeStyle = goldLeaf(ctx, x, y + s, x + s, y);
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.06, y + s * 0.52);
  ctx.lineTo(x + s * 0.44, y + s * 0.2);
  ctx.lineTo(x + s * 0.92, y - s * 0.04);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + s * 0.94, y - s * 0.1);
  ctx.lineTo(x + s * 0.72, y + s * 0.02);
  ctx.lineTo(x + s * 0.9, y + s * 0.18);
  ctx.closePath();
  ctx.fill();
}

/** A calendar, for the date pill. */
function iconCalendar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.strokeStyle = LIGHT.greenDeep;
  ctx.lineWidth = 1.8;
  roundedRect(ctx, x, y + s * 0.14, s, s * 0.86, 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.4);
  ctx.lineTo(x + s, y + s * 0.4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + s * 0.26, y);
  ctx.lineTo(x + s * 0.26, y + s * 0.24);
  ctx.moveTo(x + s * 0.74, y);
  ctx.lineTo(x + s * 0.74, y + s * 0.24);
  ctx.stroke();
}

/** The three marks under the rates: a shield, a gem, a cycle. */
function iconShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.strokeStyle = LIGHT.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.78, cy - s * 0.62);
  ctx.lineTo(cx + s * 0.78, cy + s * 0.14);
  ctx.quadraticCurveTo(cx + s * 0.78, cy + s * 0.76, cx, cy + s);
  ctx.quadraticCurveTo(cx - s * 0.78, cy + s * 0.76, cx - s * 0.78, cy + s * 0.14);
  ctx.lineTo(cx - s * 0.78, cy - s * 0.62);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.06, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.36, cy - s * 0.26);
  ctx.stroke();
}

function iconGem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.strokeStyle = LIGHT.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.5);
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();
}

function iconCycle(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.strokeStyle = LIGHT.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.82, 0.35 * Math.PI, 1.75 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + s * 0.16, cy - s * 1.02);
  ctx.lineTo(cx + s * 0.62, cy - s * 0.72);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.44);
  ctx.closePath();
  ctx.fillStyle = LIGHT.green;
  ctx.fill();
}

/** A globe and a map pin, for the footer band. */
function iconGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.strokeStyle = LIGHT.champagne;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.45, s, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();
}

function iconPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.fillStyle = LIGHT.champagne;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.22, s * 0.7, Math.PI, 0);
  ctx.lineTo(cx, cy + s);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.24, s * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = LIGHT.greenDeep;
  ctx.fill();
}

/**
 * The day's board, as a picture.
 *
 * Cream and gold with a green title band, a medallion against each rate, and
 * the shop's own bridal gold revealed behind a gold curve down the right.
 *
 * Everything read is deep green on cream or cream on deep green. The gold is
 * structural — the frame, the curve, the medallions, the rules — which is the
 * only way to use it at this scale without the figures becoming a squint.
 *
 * Per tola is set large with per gram beneath, because tola is what the market
 * quotes and the figure a customer arrives already holding.
 */
export async function renderRateCard(snapshot: RateSnapshot): Promise<Blob> {
  const [, icons, lockup] = await Promise.all([
    ensureFonts(),
    loadMetalIcons(),
    loadImage(brandLockup).catch(() => null),
  ]);
  const { canvas, ctx } = newCanvas();

  const L = 48;
  const R = 748;
  const mid = (L + R) / 2;

  // Cream, warming towards the foot.
  const ground = ctx.createLinearGradient(0, 0, 0, CARD_H);
  ground.addColorStop(0, LIGHT.ivory);
  ground.addColorStop(0.6, LIGHT.cream);
  ground.addColorStop(1, LIGHT.champagne);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  /*
   * The jewellery, behind a curve rather than a straight edge.
   *
   * The photograph is bundled with the site, so it is same-origin and cannot
   * taint the canvas the way a storage image would. The curve is stroked in
   * gold afterwards, which is what turns a cropped photograph into an inlay.
   */
  const sweep = new Path2D();
  sweep.moveTo(CARD_W, 0);
  sweep.lineTo(792, 0);
  sweep.bezierCurveTo(846, 300, 742, 560, 806, 830);
  sweep.bezierCurveTo(852, 1030, 826, 1180, 906, CARD_H);
  sweep.lineTo(CARD_W, CARD_H);
  sweep.closePath();

  try {
    const bg = await loadImage(rateCardBackground);
    ctx.save();
    ctx.clip(sweep);
    drawCover(ctx, bg, 700, 0, CARD_W - 700, CARD_H, 120);
    // A whisper of cream so the gold in the picture sits with the card's gold.
    ctx.fillStyle = "rgba(250,247,242,0.12)";
    ctx.fillRect(700, 0, CARD_W - 700, CARD_H);
    ctx.restore();
  } catch {
    ctx.save();
    ctx.clip(sweep);
    ctx.fillStyle = LIGHT.greenDeep;
    ctx.fillRect(700, 0, CARD_W - 700, CARD_H);
    ctx.restore();
  }

  ctx.strokeStyle = goldLeaf(ctx, 760, 0, 920, CARD_H);
  ctx.lineWidth = 7;
  ctx.stroke(sweep);

  /*
   * The lockup, as artwork.
   *
   * Drawn from the brand file rather than assembled here out of an arch, a
   * circle and two tracked words. That approximation was only ever standing in
   * for a logo the shop had not sent yet; now it has, and a canvas can draw an
   * SVG straight to itself so long as the file is same-origin and carries no
   * outside references. This one is bundled and self-contained on both counts.
   *
   * If it will not load the card still goes out, one element lighter — the
   * figures are what somebody opened it for.
   */
  if (lockup) {
    const lockupH = 190;
    const lockupW = (lockup.width / lockup.height) * lockupH;
    ctx.drawImage(lockup, mid - lockupW / 2, 62, lockupW, lockupH);
  }

  ctx.fillStyle = LIGHT.greenSoft;
  ctx.font = `600 17px ${SANS}`;

  const creed = ["TRUST", "PURITY", "TIMELESS BEAUTY"];
  const creedGap = 52;
  const creedW = creed.map((word) => trackedWidth(ctx, word, 5));
  const creedTotal = creedW.reduce((a, b) => a + b, 0) + creedGap * (creed.length - 1);

  let creedX = mid - creedTotal / 2;
  creed.forEach((word, i) => {
    tracked(ctx, word, creedX, 292, 5);
    creedX += creedW[i]!;

    if (i < creed.length - 1) {
      ornament(ctx, creedX + creedGap / 2, 287, 8, LIGHT.gold);
      creedX += creedGap;
    }
  });

  // The title band.
  const bandY = 318;
  const bandH = 128;

  ctx.save();
  ctx.shadowColor = "rgba(11,61,46,0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = LIGHT.green;
  roundedRect(ctx, L, bandY, R - L, bandH, 16);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = goldLeaf(ctx, L, bandY, R, bandY + bandH);
  ctx.lineWidth = 3;
  roundedRect(ctx, L, bandY, R - L, bandH, 16);
  ctx.stroke();

  iconRising(ctx, L + 34, bandY + 36, 58);

  /*
   * "Today's Gold Rate", with only the middle word in gold.
   *
   * Set in three pieces and centred as one, so the gold word sits where it
   * belongs rather than where a guess at its width would put it.
   */
  ctx.textAlign = "left";
  ctx.font = `300 58px ${DISPLAY}`;
  const w1 = ctx.measureText("Today's ").width;
  const w3 = ctx.measureText(" Rate").width;
  ctx.font = `600 58px ${DISPLAY}`;
  const w2 = ctx.measureText("Gold").width;

  const titleX = L + 130 + (R - L - 130 - (w1 + w2 + w3)) / 2;
  const titleY = bandY + 64;

  ctx.font = `300 58px ${DISPLAY}`;
  ctx.fillStyle = LIGHT.ivory;
  ctx.fillText("Today's ", titleX, titleY);

  ctx.font = `600 58px ${DISPLAY}`;
  ctx.fillStyle = goldLeaf(ctx, titleX + w1, titleY - 40, titleX + w1 + w2, titleY + 8);
  ctx.fillText("Gold", titleX + w1, titleY);

  ctx.font = `300 58px ${DISPLAY}`;
  ctx.fillStyle = LIGHT.ivory;
  ctx.fillText(" Rate", titleX + w1 + w2, titleY);

  ctx.fillStyle = "rgba(250,247,242,0.92)";
  ctx.font = `500 26px ${SANS}`;
  tracked(ctx, "MANDI BAHAUDDIN", L + 130 + (R - L - 130) / 2, bandY + 106, 6, "center");

  /*
   * The stamp, without its timezone. The website labels the zone because a
   * reader in Dubai or Toronto would otherwise assume their own clock; a
   * picture forwarded inside Pakistan does not need telling.
   */
  const stamp = formatRateStamp(snapshot).replace(/\s*PKT\s*$/, "");

  ctx.font = `500 24px ${SANS}`;
  const pillW = ctx.measureText(stamp).width + 108;
  const pillY = bandY + bandH + 14;

  ctx.fillStyle = goldLeaf(ctx, mid - pillW / 2, pillY, mid + pillW / 2, pillY + 52);
  roundedRect(ctx, mid - pillW / 2, pillY, pillW, 52, 26);
  ctx.fill();

  iconCalendar(ctx, mid - pillW / 2 + 30, pillY + 16, 20);

  ctx.fillStyle = LIGHT.greenDeep;
  ctx.textAlign = "left";
  ctx.fillText(stamp, mid - pillW / 2 + 66, pillY + 34);

  // The board, in the order the shop reads it out.
  const rows = RATE_BOARD.flatMap((entry) => {
    const rate = snapshot.rates.find((r) => r.karat === entry.karat);
    return rate
      ? [{ karat: String(entry.karat), mark: String(entry.mark), name: String(entry.name), rate }]
      : [];
  });

  const rowH = 112;
  let y = pillY + 74;

  rows.forEach((row) => {
    const h = rowH - 14;

    const fill = ctx.createLinearGradient(L, y, R, y);
    fill.addColorStop(0, "rgba(255,253,250,0.95)");
    fill.addColorStop(1, "rgba(242,231,212,0.85)");
    ctx.fillStyle = fill;
    roundedRect(ctx, L, y, R - L, h, 14);
    ctx.fill();

    ctx.strokeStyle = "rgba(201,162,75,0.42)";
    ctx.lineWidth = 1.2;
    roundedRect(ctx, L, y, R - L, h, 14);
    ctx.stroke();

    const cy = y + h / 2;

    medallion(ctx, L + 54, cy, 33);

    const mark = icons[row.karat];
    if (mark) {
      // Fitted inside the disc rather than filling it, so a square icon and a
      // wide one both sit on the same optical circle.
      const box = 40;
      const scale = Math.min(box / mark.width, box / mark.height);
      const w = mark.width * scale;
      const h = mark.height * scale;
      ctx.drawImage(mark, L + 54 - w / 2, cy - h / 2, w, h);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = LIGHT.green;
    ctx.font = `400 38px ${DISPLAY}`;
    ctx.fillText(row.name === "Silver" ? "Silver" : "Gold", L + 106, cy - 4);

    ctx.fillStyle = LIGHT.greenSoft;
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText(
      row.name === "Silver" ? `(${row.mark})` : `${row.name} (${row.mark})`,
      L + 106,
      cy + 30,
    );

    ctx.fillStyle = "rgba(201,162,75,0.5)";
    ctx.fillRect(L + 330, cy - 26, 1.5, 52);

    ctx.textAlign = "right";
    ctx.fillStyle = LIGHT.green;
    ctx.font = `700 50px ${SANS}`;
    ctx.fillText(row.rate.perTola.toLocaleString("en-US"), R - 26, cy + 2);

    ctx.fillStyle = LIGHT.greenSoft;
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(`${row.rate.perGram.toLocaleString("en-US")} per gram`, R - 26, cy + 34);

    y += rowH;
  });

  y += 6;
  const sep = ctx.createLinearGradient(L + 60, 0, R - 60, 0);
  sep.addColorStop(0, "rgba(201,162,75,0)");
  sep.addColorStop(0.5, "rgba(201,162,75,0.7)");
  sep.addColorStop(1, "rgba(201,162,75,0)");
  ctx.fillStyle = sep;
  ctx.fillRect(L + 60, y, R - L - 120, 1.5);
  ornament(ctx, mid, y, 11, LIGHT.gold);

  ctx.textAlign = "center";
  ctx.fillStyle = LIGHT.greenSoft;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText("Rates are indicative · Per tola, in Pakistani rupees", mid, y + 44);

  ctx.fillStyle = LIGHT.bronze;
  ctx.font = `400 italic 38px ${DISPLAY}`;
  ctx.fillText(SITE.tagline, mid, y + 98);

  /*
   * Three marks the shop can stand behind.
   *
   * The design this follows says "100% pure gold", which would be untrue over
   * a board whose own headline figure is 22k. These are the promises the rest
   * of the site already makes.
   */
  const marks: {
    icon: (c: CanvasRenderingContext2D, x: number, yy: number, s: number) => void;
    lines: string[];
  }[] = [
    { icon: iconShield, lines: ["HALLMARKED", "GOLD"] },
    { icon: iconGem, lines: [`SINCE ${SITE.founded}`] },
    { icon: iconCycle, lines: ["LIFETIME", "BUY-BACK"] },
  ];

  const markY = y + 158;
  const step = (R - L) / marks.length;

  marks.forEach((m, i) => {
    const bx = L + step * i + step / 2;

    if (i > 0) {
      ctx.fillStyle = "rgba(201,162,75,0.4)";
      ctx.fillRect(L + step * i, markY - 24, 1, 48);
    }

    m.icon(ctx, bx - 58, markY, 15);

    ctx.textAlign = "left";
    ctx.fillStyle = LIGHT.green;
    ctx.font = `700 17px ${SANS}`;
    m.lines.forEach((line, li) => {
      tracked(ctx, line, bx - 34, markY - 4 + li * 22, 1.5);
    });
  });

  /*
   * The footer band: the address to type, and the address to walk to.
   *
   * Deep green across the foot, which anchors a card that is otherwise all
   * cream, and gives the one line somebody has to read back the highest
   * contrast on the whole picture.
   */
  const footY = CARD_H - 104;

  ctx.fillStyle = LIGHT.green;
  ctx.beginPath();
  ctx.moveTo(0, footY + 26);
  ctx.quadraticCurveTo(CARD_W * 0.4, footY - 16, CARD_W, footY + 4);
  ctx.lineTo(CARD_W, CARD_H);
  ctx.lineTo(0, CARD_H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = goldLeaf(ctx, 0, footY, CARD_W, footY + 30);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, footY + 26);
  ctx.quadraticCurveTo(CARD_W * 0.4, footY - 16, CARD_W, footY + 4);
  ctx.stroke();

  const footTextY = CARD_H - 40;

  iconGlobe(ctx, 70, footTextY - 8, 15);

  ctx.textAlign = "left";
  ctx.fillStyle = LIGHT.champagne;
  ctx.font = `600 26px ${SANS}`;
  // Taken from the canonical origin rather than typed again, so the card cannot
  // drift from the address the rest of the site declares.
  const urlText = SITE.origin.replace(/^https?:\/\//, "");
  ctx.fillText(urlText, 98, footTextY);

  const dividerX = 98 + ctx.measureText(urlText).width + 34;
  ctx.fillStyle = "rgba(242,231,212,0.4)";
  ctx.fillRect(dividerX, footTextY - 22, 1.5, 30);

  iconPin(ctx, dividerX + 34, footTextY - 12, 14);

  ctx.fillStyle = LIGHT.champagne;
  ctx.font = `400 24px ${SANS}`;
  ctx.fillText("Sarafa Market, Mandi Bahauddin", dividerX + 58, footTextY);

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
