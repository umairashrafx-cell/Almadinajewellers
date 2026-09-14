import type { ProductDetail } from "@/lib/catalogue";
import { formatRateDate, rateFor, rateStampParts, type RateSnapshot } from "@/lib/rates";
import { SITE, formatGrams, formatPKR, productUrl } from "@/lib/site";

/**
 * WhatsApp share messages.
 *
 * Distinct from `whatsappLink` in lib/site, which addresses the shop. These
 * open WhatsApp with no recipient so the sender picks one — the customer is
 * forwarding a piece to her sister, or the shop is sending the morning rate to
 * a broadcast list.
 *
 * WhatsApp renders a small amount of markup: *bold*, _italic_ and a ```block```
 * that is set in a monospace face. That last one is the only way to make
 * columns line up, which is the difference between a rate table that looks
 * considered and one that wraps into a mess on a narrow phone.
 */

/** Opens WhatsApp with the message ready and the recipient still to choose. */
export function shareOnWhatsApp(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Right-pads a label so monospace columns start at the same place. */
function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

/**
 * Left-pads figures to a common width so their right edges line up.
 *
 * Numbers read as a column when their units align; left-aligned currency in a
 * monospace block leaves a ragged edge that undoes the point of using one.
 */
function alignRight(values: string[]): string[] {
  const width = Math.max(...values.map((v) => v.length));
  return values.map((v) => " ".repeat(width - v.length) + v);
}

/**
 * A single piece, formatted for forwarding.
 *
 * Leads with the name and the price because that is what the recipient is being
 * asked about. The three-part breakdown follows when the piece has one — it is
 * the shop's whole argument, and it travels better in a message than a link the
 * recipient may never open.
 */
export function productShareMessage(product: ProductDetail, listedPkr: number): string {
  const lines: string[] = [
    `*${product.name}*`,
    `${SITE.name} · ${SITE.address.split(",")[1]?.trim() ?? "Mandi Bahauddin"}`,
    "",
    `${product.karat} ${product.metal} · ${formatGrams(product.grossWeightG)}`,
  ];

  if (product.stones) lines.push(product.stones);

  lines.push("", `*${formatPKR(listedPkr)}*`);

  if (product.salePricePkr && product.salePricePkr < product.pricePkr) {
    lines.push(`~${formatPKR(product.pricePkr)}~  ·  Sale price`);
  }

  const b = product.breakdown;
  if (b) {
    const labels = ["Gold value", "Making", "Stones"];
    const amounts = alignRight(
      [b.metalValuePkr, b.makingChargesPkr, b.stoneValuePkr].map(formatPKR),
    );
    lines.push(
      "",
      "```",
      ...labels.map((label, i) => `${pad(label, 13)}${amounts[i]}`),
      "```",
      `_Priced against today's ${product.karat} rate of Rs. ${b.rateBasisPkrPerG.toLocaleString("en-US")}/g._`,
    );
  }

  lines.push(
    "",
    "Hallmarked, and weighed in front of you before it is billed.",
    "",
    productUrl(product.slug),
  );

  return lines.join("\n");
}

/**
 * The day's rates as a message: the one text behind both the Copy button and
 * the WhatsApp share on the rate page, so the two can never say different
 * things.
 *
 * Each figure is the board's headline — the rate per tola — with no unit
 * written beside it, as the shop words it. The figures, the date and the time
 * all come from the published snapshot; none is typed here. A metal the shop
 * has not published today is left out rather than shown as a placeholder, and
 * so is the time on the rare snapshot that carries only a date.
 */
export function rateShareMessage(snapshot: RateSnapshot): string {
  const rupees = (karat: string) => {
    const rate = rateFor(snapshot, karat);
    return rate ? `Rs. ${rate.perTola.toLocaleString("en-US")}` : undefined;
  };

  const stamp = snapshot.publishedAt ? rateStampParts(snapshot.publishedAt) : undefined;
  const date = stamp?.date ?? formatRateDate(snapshot.date);

  const rows: [string, string | undefined][] = [
    // Labels exactly as the shop writes them: the three gold lines carry a
    // space before the colon, silver does not.
    ["24K ", rupees("24K")],
    ["23.65K ", rupees("23.65K")],
    ["22K ", rupees("22K")],
    ["Silver", rupees("999")],
  ];

  return [
    `Gold & Silver Rates — ${date}`,
    ...(stamp ? [`Updated: ${stamp.time} PKT`] : []),
    "",
    ...rows.flatMap(([label, value]) => (value ? [`${label}: ${value}`] : [])),
    "",
    "Prices may vary. Final rates are confirmed at the time of purchase.",
  ].join("\n");
}
