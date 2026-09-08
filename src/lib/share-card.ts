import rateCardBackground from "@/assets/hero-bridal.jpg";
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

/** A small gold diamond, used to break the panel's sections. */
function ornament(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = COLOUR.gold;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

/**
 * The day's board, as a picture.
 *
 * Laid over a photograph of the shop's own bridal gold rather than flat green.
 * The panel holding the figures is drawn dark enough to read at a glance in a
 * chat list, with the jewellery left showing down the right side — the picture
 * has to survive being a thumbnail before it can be admired at full size.
 *
 * Per tola is set large with per gram small beneath it, because tola is what
 * the market quotes and the figure a customer arrives already holding.
 */
export async function renderRateCard(snapshot: RateSnapshot): Promise<Blob> {
  await ensureFonts();
  const { canvas, ctx } = newCanvas();

  ctx.fillStyle = COLOUR.deep;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // The background is bundled with the site, so it is same-origin and cannot
  // taint the canvas the way a storage photograph would.
  try {
    const bg = await loadImage(rateCardBackground);
    drawCover(ctx, bg, 0, 0, CARD_W, CARD_H, 300);
  } catch {
    // Flat green is a perfectly good card; the figures are the point.
  }

  /*
   * Two washes over the photograph. A flat one to sink the whole picture, then
   * a left-weighted one so the panel side is dark enough for small text while
   * the jewellery still shows on the right.
   */
  ctx.fillStyle = "rgba(4,24,15,0.38)";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const side = ctx.createLinearGradient(0, 0, CARD_W, 0);
  side.addColorStop(0, "rgba(4,24,15,0.80)");
  side.addColorStop(0.6, "rgba(4,24,15,0.36)");
  side.addColorStop(1, "rgba(4,24,15,0)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // The masthead sits on the photograph rather than on the panel, so it gets
  // its own ground rather than trusting whatever the picture happens to show.
  const top = ctx.createLinearGradient(0, 0, 0, 300);
  top.addColorStop(0, "rgba(4,24,15,0.9)");
  top.addColorStop(1, "rgba(4,24,15,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, CARD_W, 300);

  const PANEL_X = 46;
  const PANEL_W = 748;

  // Masthead, centred over the panel column rather than the whole card.
  const mid = PANEL_X + PANEL_W / 2;

  ornament(ctx, mid, 78, 16);

  ctx.textAlign = "left";
  ctx.fillStyle = COLOUR.gold;
  ctx.font = `300 70px ${DISPLAY}`;
  tracked(ctx, "AL-MADINA", mid, 170, 7, "center");

  ctx.fillStyle = COLOUR.champagne;
  ctx.font = `500 22px ${SANS}`;
  tracked(ctx, "JEWELLERS", mid, 210, 12, "center");

  const rule = ctx.createLinearGradient(mid - 200, 0, mid + 200, 0);
  rule.addColorStop(0, "rgba(201,162,75,0)");
  rule.addColorStop(0.5, COLOUR.gold);
  rule.addColorStop(1, "rgba(201,162,75,0)");
  ctx.fillStyle = rule;
  ctx.fillRect(mid - 200, 232, 400, 1);

  ctx.fillStyle = "rgba(232,217,181,0.85)";
  ctx.font = `500 18px ${SANS}`;
  tracked(ctx, "TRUST · PURITY · TIMELESS BEAUTY", mid, 268, 4, "center");

  // The panel.
  /*
   * Panel geometry is budgeted rather than guessed. Everything below stacks
   * from the top of the rows, and the address pill has to land inside the
   * panel: at these sizes there are 22 pixels to spare beneath it.
   */
  const panelY = 300;
  const panelH = CARD_H - panelY - 36;

  ctx.fillStyle = "rgba(4,24,15,0.84)";
  roundedRect(ctx, PANEL_X, panelY, PANEL_W, panelH, 28);
  ctx.fill();

  ctx.strokeStyle = "rgba(201,162,75,0.45)";
  ctx.lineWidth = 1.5;
  roundedRect(ctx, PANEL_X, panelY, PANEL_W, panelH, 28);
  ctx.stroke();

  ctx.textAlign = "center";

  ctx.fillStyle = COLOUR.ivory;
  ctx.font = `300 76px ${DISPLAY}`;
  ctx.fillText("Today's Gold Rate", mid, panelY + 100);

  ctx.fillStyle = COLOUR.gold;
  ctx.font = `500 25px ${SANS}`;
  tracked(ctx, "MANDI BAHAUDDIN", mid, panelY + 146, 5, "center");

  /*
   * The stamp without its timezone.
   *
   * formatRateStamp appends PKT for the website, where a reader in Dubai or
   * Toronto needs telling which clock it is. A picture forwarded inside
   * Pakistan does not, and the shop asked for it gone.
   */
  const stamp = formatRateStamp(snapshot).replace(/\s*PKT\s*$/, "");

  ctx.font = `400 22px ${SANS}`;
  const stampW = ctx.measureText(stamp).width + 56;
  ctx.strokeStyle = "rgba(201,162,75,0.4)";
  ctx.lineWidth = 1;
  roundedRect(ctx, mid - stampW / 2, panelY + 168, stampW, 50, 25);
  ctx.stroke();

  ctx.fillStyle = "rgba(232,217,181,0.9)";
  ctx.fillText(stamp, mid, panelY + 200);

  // The board, in the order the shop reads it out.
  const rows = RATE_BOARD.flatMap((entry) => {
    const rate = snapshot.rates.find((r) => r.karat === entry.karat);
    return rate ? [{ name: String(entry.name), mark: String(entry.mark), rate }] : [];
  });

  const rowH = 124;
  const rowW = PANEL_W - 76;
  const rowX = PANEL_X + 38;
  let y = panelY + 240;

  rows.forEach((row) => {
    ctx.fillStyle = "rgba(232,217,181,0.06)";
    roundedRect(ctx, rowX, y, rowW, rowH - 16, 18);
    ctx.fill();

    ctx.strokeStyle = "rgba(201,162,75,0.18)";
    ctx.lineWidth = 1;
    roundedRect(ctx, rowX, y, rowW, rowH - 16, 18);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLOUR.ivory;
    ctx.font = `400 46px ${DISPLAY}`;
    ctx.fillText(row.name, rowX + 30, y + 62);

    const nameW = ctx.measureText(row.name).width;
    ctx.fillStyle = COLOUR.gold;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText(`(${row.mark})`, rowX + 30 + nameW + 13, y + 62);

    ctx.textAlign = "right";
    ctx.fillStyle = COLOUR.gold;
    ctx.font = `600 52px ${SANS}`;
    ctx.fillText(row.rate.perTola.toLocaleString("en-US"), rowX + rowW - 30, y + 56);

    ctx.fillStyle = "rgba(232,217,181,0.7)";
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(`${row.rate.perGram.toLocaleString("en-US")} per gram`, rowX + rowW - 30, y + 92);

    y += rowH;
  });

  y += 10;
  ornament(ctx, mid, y, 10);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(232,217,181,0.6)";
  ctx.font = `400 21px ${SANS}`;
  ctx.fillText("Rates are indicative · Per tola, in Pakistani rupees", mid, y + 54);

  ctx.fillStyle = COLOUR.gold;
  ctx.font = `400 italic 38px ${DISPLAY}`;
  ctx.fillText(SITE.tagline, mid, y + 106);

  /*
   * Three claims the shop can stand behind.
   *
   * The reference this was drawn from said "100% pure gold", which would be
   * untrue over a board whose own headline figure is 22k. These are the things
   * the rest of the site already promises.
   */
  const badges = ["HALLMARKED", `SINCE ${SITE.founded}`, "LIFETIME BUY-BACK"];
  const badgeY = y + 152;
  const step = rowW / badges.length;

  ctx.font = `600 17px ${SANS}`;
  badges.forEach((badge, i) => {
    const bx = rowX + step * i + step / 2;

    if (i > 0) {
      ctx.fillStyle = "rgba(201,162,75,0.3)";
      ctx.fillRect(rowX + step * i, badgeY - 18, 1, 26);
    }

    ctx.fillStyle = "rgba(232,217,181,0.8)";
    tracked(ctx, badge, bx, badgeY, 2, "center");
  });

  /*
   * The address, in a pill, last.
   *
   * Set in a heavier weight and left almost untracked. It was spaced like the
   * wordmark, which suits three words in display type and ruins one long
   * lowercase string — the gaps invited the eye to read breaks that are not
   * there. This is the line somebody has to be able to type back in.
   */
  ctx.font = `600 26px ${SANS}`;
  // Taken from the canonical origin rather than typed again, so the card cannot
  // drift from the address the rest of the site declares.
  const urlText = SITE.origin.replace(/^https?:\/\//, "");
  const urlW = ctx.measureText(urlText).width + 96;
  const urlY = badgeY + 46;

  ctx.fillStyle = "rgba(201,162,75,0.16)";
  roundedRect(ctx, mid - urlW / 2, urlY, urlW, 64, 32);
  ctx.fill();
  ctx.strokeStyle = "rgba(201,162,75,0.55)";
  ctx.lineWidth = 1.5;
  roundedRect(ctx, mid - urlW / 2, urlY, urlW, 64, 32);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = COLOUR.gold;
  ctx.fillText(urlText, mid, urlY + 42);

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
