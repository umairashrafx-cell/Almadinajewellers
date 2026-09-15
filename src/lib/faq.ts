import type { FaqItem } from "@/components/page/Faq";
import { STORES } from "@/lib/site";

/**
 * The shop's frequently asked questions, by topic.
 *
 * Kept here rather than in the FAQ route so the pages that cover one topic in
 * depth — hallmarking, buy-back, delivery — show the same answers word for word
 * instead of a second copy that drifts.
 */

export type FaqTopic = { id: string; title: string; items: FaqItem[] };

const store = STORES[0]!;

/**
 * Every answer here restates something the shop already tells customers
 * elsewhere on the site — the contact and Sell Your Gold FAQs, the policies,
 * Our Story and the product pages. Nothing has been invented to fill a topic;
 * a question the site has no answer to is left out rather than guessed at.
 * When a policy changes, change it at its source page and here.
 */
export const FAQ_TOPICS: FaqTopic[] = [
  {
    id: "ordering",
    title: "Buying & ordering",
    items: [
      {
        q: "Can I buy on the website?",
        a: "You can save pieces to your wishlist, add them to your bag and send an order request, or ask about any piece on WhatsApp. There is no online checkout: we confirm the weight and the price with you first, and payment is then settled in store or on confirmed delivery.",
        more: { label: "Browse the collections", to: "/collections" },
      },
      {
        q: "How do I order if I am not in Mandi Bahauddin?",
        a: "Message us on WhatsApp with the piece you want. We send photographs and a video, confirm the weight and the price against the day's gold rate, and deliver insured anywhere in Pakistan at no charge.",
      },
      {
        q: "Can rings be resized?",
        a: "Yes, and sizing is adjusted in store at no charge. For a ring bought as a gift, come in with the person it was for and we will fit it properly.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & the gold rate",
    items: [
      {
        q: "How is the price of a piece calculated?",
        a: "Gold value plus making charges plus the value of any stones. The gold is charged at the day's rate for its karat, on the metal weight plus polish. Every product page shows the parts separately, and the final price is confirmed at the counter on the day you buy.",
      },
      {
        q: "Where can I see today's gold rate?",
        a: "The shop publishes its rates every day for 24K (Piece), 23.65K (Pathor) and 22K (Jewellery) gold and for silver, per tola and per gram, with the time they were last updated.",
        more: { label: "Today's gold rate", to: "/gold-rate-in-mandi-bahauddin-today" },
      },
      {
        q: "Why does the price of the same piece change from day to day?",
        a: "Only the gold moves. It is priced against the rate for that day, while making charges and stone values stay fixed in rupees — the work does not cost more because gold rose that morning.",
      },
      {
        q: "How many grams are in a tola?",
        a: "One tola is 11.6638 grams. Rates are quoted per tola because that is how gold is priced in the market, and per gram alongside it.",
      },
    ],
  },
  {
    id: "purity",
    title: "Purity & hallmarking",
    items: [
      {
        q: "What karat is your jewellery?",
        a: "Gold jewellery is stamped 22K, and 18K for diamond settings. Silver is stamped 925. The stamp is on the piece itself, not just the bill.",
        more: { label: "Hallmarking & purity", to: "/hallmarking" },
      },
      {
        q: "Is my piece weighed in front of me?",
        a: "Yes. Every piece goes on a calibrated scale at the counter before it is billed, and the gross weight, net metal weight and stone weight are all written down. For delivery orders, the piece is shown weighed on video before it is dispatched.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling gold & buy-back",
    items: [
      {
        q: "Do you buy back what you sell?",
        a: "Yes, for as long as we are trading. Bring the piece and its bill and we buy it back against the gold rate on the day you return it, not the day you bought it. Making charges are not returned, which is standard across the trade.",
        more: { label: "How buy-back & exchange work", to: "/buy-back-exchange" },
      },
      {
        q: "How much will you pay for my gold?",
        a: "We buy jewellery at the 20K rate, which is published on the Sell Your Gold page and moves with the market each day. You are paid that rate against the weight of your piece, weighed in front of you.",
        more: { label: "See today's buying rate", to: "/sell-your-gold" },
      },
      {
        q: "Can I sell jewellery bought from another shop?",
        a: "Yes. Gold bought from another jeweller, inherited jewellery and old or broken pieces are all assessed the same way: tested for purity and weighed in front of you, then quoted against the day's buying rate.",
      },
      {
        q: "What do I need to bring?",
        a: "Your CNIC — we cannot buy gold without it, whatever the piece is. The original bill is not required to sell, but it saves time because it already carries the weight and the karat.",
      },
      {
        q: "Can I refuse the offer?",
        a: "Yes. There is no obligation to sell. If the figure is not for you, your gold goes home with you.",
      },
      {
        q: "How am I paid when I sell?",
        a: "Cash at the counter, a bank transfer to your account, or an exchange against a new piece. You choose once the figure is agreed.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery & payment",
    items: [
      {
        q: "Do you charge for delivery?",
        a: "No. Delivery is insured and free of charge anywhere in Pakistan, on every order, regardless of value.",
        more: { label: "Delivery & payment", to: "/delivery-payment" },
      },
      {
        q: "How soon will my order be dispatched?",
        a: "Dispatch timing is confirmed with you when you order. Pieces in stock go quickly; bridal work is made to order and is ready within ten days.",
      },
      {
        q: "How do I pay for a piece?",
        a: "Payment is arranged in store, or on confirmed delivery. No card details are ever entered on this website — there is nothing here to take them.",
        more: { label: "How ordering & payment work", to: "/delivery-payment" },
      },
    ],
  },
  {
    id: "custom",
    title: "Custom orders & bridal",
    items: [
      {
        q: "Can you make a piece to my design?",
        a: "Yes. Send a photograph, a description or a voice note of what you have in mind. Nothing is charged and nothing is committed: we call to talk it through, and quote against the gold rate on the day the work is agreed.",
        more: { label: "Start a custom order", to: "/custom-order" },
      },
      {
        q: "How long does a bridal set take?",
        a: "Within ten days. Bridal work is made to order. We send photographs through the making so nothing is a surprise at the end. If your wedding is sooner, tell us the date and we will be honest about what is possible.",
      },
      {
        q: "Can I book a bridal consultation?",
        a: "Yes. It is an hour at the counter with the full range out on the tray, the day's rate in front of you, and no obligation. Tell us when suits and we will keep the time free.",
        more: { label: "Book a consultation", to: "/bridal" },
      },
    ],
  },
  {
    id: "visiting",
    title: "Visiting the shop",
    items: [
      {
        q: "Where is the shop and when is it open?",
        a: `We are at ${store.address}. Open ${store.hours}; ${store.closed.toLowerCase()}.`,
        more: { label: "Map & directions", to: "/stores" },
      },
    ],
  },
];

export const ALL_FAQ_ITEMS = FAQ_TOPICS.flatMap((topic) => topic.items);

/** One topic's questions, for a page that answers the same ground in more depth. */
export function faqTopic(id: string): FaqTopic {
  const topic = FAQ_TOPICS.find((t) => t.id === id);
  if (!topic) throw new Error(`No FAQ topic "${id}"`);
  return topic;
}
