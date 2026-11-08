import { SITE } from "@/lib/site";

/**
 * The words three of the website's pages are built from.
 *
 * Lifted here, unchanged, so the app's own Sell Your Gold, Our Story and
 * Contact screens can be built from the shop's actual copy rather than from a
 * second draft of it. Nothing on this file was written for the app: every
 * sentence is already on almadinajeweller.com, and the app screens are a
 * rearrangement of it for a phone, not a rewrite.
 *
 * That matters more here than it looks. These pages make claims — what the
 * shop buys, what it needs from a seller, how a valuation is reached, how long
 * bridal work takes — and a claim that drifts between the website and the app
 * is a claim one of them is now getting wrong. Keeping the words in one file
 * is the cheapest way to make the drift impossible to do by accident.
 *
 * The website routes still hold their own copies at the time of writing. They
 * were not changed to import from here because two of the three were carrying
 * uncommitted work from other branches, and a refactor across them would have
 * collided with it. Those three consts should be deleted and replaced with
 * imports from this file once that work has landed:
 *
 *   src/routes/our-story.tsx      GENERATIONS, STANDARDS
 *   src/routes/sell-your-gold.tsx GOLD_WE_BUY, STEPS, PAYMENT, FAQS
 *   src/routes/contact.tsx        FAQS
 */

/* ---------------------------------------------------------------- our story */

export const GENERATIONS = [
  {
    era: "The first generation",
    title: "A counter in Sarafa Market",
    body: `${SITE.founder} opened the shop with a scale, a set of files and a rule he repeated to every customer: the weight on the bill is the weight in your hand. Trade in Sarafa Market ran on reputation, and reputation ran on the scale being honest.`,
  },
  {
    era: "The second generation",
    title: "The workshop behind the shop",
    body: "His sons learned the bench before they learned the counter — annealing, drawing wire, setting stones, finishing by hand. Bringing the making in-house meant the family could stand behind the purity of a piece because they had made it themselves.",
  },
  {
    era: "Today",
    title: "The same scale, a wider counter",
    body: "The third generation runs the shop and the workshop together. Families order from across Pakistan and from abroad, over WhatsApp and video call, with insured delivery at the end. What has not changed is that every piece is hallmarked, weighed in front of the customer, and carries a lifetime buy-back.",
  },
] as const;

export const STANDARDS = [
  {
    title: "Hallmarked purity",
    body: "Gold is stamped 22K, and 18K for diamond settings. Silver is stamped 925. The stamp is on the piece, not just the bill.",
  },
  {
    title: "Weighed in front of you",
    body: "Every piece goes on a calibrated scale at the counter before it is billed. Gross weight, net metal weight and stone weight are all written down.",
  },
  {
    title: "Priced against the day's rate",
    body: "Gold value, making charges and stone value are quoted separately, so you can see exactly what you are paying for the metal and what you are paying for the work.",
  },
  {
    title: "Lifetime buy-back",
    body: "Bring a piece back with its bill at any time and we buy it back against the gold rate on the day you return, not the day you bought.",
  },
] as const;

/* ----------------------------------------------------------- sell your gold */

export const GOLD_WE_BUY = [
  { title: "Gold Rings", body: "Old, unwanted or unused rings." },
  { title: "Gold Chains", body: "Chains of different weights and designs." },
  { title: "Gold Bangles", body: "Old and unused bangles." },
  { title: "Gold Necklaces", body: "Complete sets or individual pieces." },
  { title: "Broken Gold", body: "Broken chains, damaged jewellery and incomplete pieces." },
  { title: "Single Earrings", body: "Individual or unmatched gold earrings." },
] as const;

export const SELL_STEPS = [
  {
    title: "Bring Your Gold",
    body: "Bring your gold jewellery and your CNIC. No appointment is needed.",
  },
  {
    title: "Purity Testing",
    body: "We check the purity of your gold and establish its karat.",
  },
  {
    title: "Open Weighing",
    body: "Your gold is weighed on the counter scale in front of you.",
  },
  {
    title: "Transparent Quote",
    body: "We calculate the value from the current 20K buying rate and the weight and purity established at the counter.",
  },
  {
    title: "You Decide",
    body: "Accept the offer or take your gold back. There is no obligation to sell.",
  },
] as const;

export const SELL_PAYMENT = [
  { title: "Cash", body: "Paid at the counter after the valuation is agreed." },
  {
    title: "Bank Transfer",
    body: "Transferred to your account, if you would rather not carry cash.",
  },
  { title: "Exchange", body: "Put the value towards a new jewellery piece." },
] as const;

export type Faq = { q: string; a: string };

/**
 * The sell-your-gold questions.
 *
 * Shortened to the six a customer asks before setting out, in the order they
 * ask them. The website carries ten; the four left behind are the ones that
 * only matter once you are standing at the counter, where there is somebody
 * to ask. Not one of the six has been reworded.
 */
export const SELL_FAQS: readonly Faq[] = [
  {
    q: "Do I need my CNIC?",
    a: "Yes. We need your CNIC to buy gold from you, whether the piece came from us or from anywhere else. Please bring it with you — without it we cannot complete the purchase, whatever the piece is worth.",
  },
  {
    q: "Do I need my original bill to sell gold?",
    a: "Not to sell it — but you do need your CNIC, whatever the piece is. The bill only saves time: it already carries the weight and the karat, so there is nothing to establish. The rate is the same 20K rate either way, whether the piece came from us or from anywhere else.",
  },
  {
    q: "How much will you pay for my gold?",
    a: "We buy jewellery at the 20K rate, which is published on this page and moves with the market each day. What you are paid is that rate against the weight of your piece, weighed in front of you. The rate is below what we sell at, and the difference is the melting and the making that has to be done again before the gold can be sold as jewellery.",
  },
  {
    q: "Can I sell jewellery bought from another shop?",
    a: "Yes. Gold bought from another jeweller, inherited jewellery and old pieces are all assessed the same way. We test the purity and weigh the piece in front of you, then quote against the day's buying rate. You are under no obligation to accept.",
  },
  {
    q: "Do you buy broken or old jewellery?",
    a: "Yes. Gold is valued on its purity and weight, so a broken chain or a single earring is worth what the gold in it is worth. It does not need to be wearable or a complete set.",
  },
  {
    q: "Do you buy silver or diamond jewellery?",
    a: "This service is for gold. Silver and stone-set pieces are assessed differently, so ask us at the shop or on WhatsApp before making the trip for those.",
  },
] as const;

/* -------------------------------------------------------------------- contact */

export const CONTACT_FAQS: readonly Faq[] = [
  {
    q: "How do I order if I am not in Mandi Bahauddin?",
    a: "Message us on WhatsApp with the piece you want. We send photographs and a video, confirm the weight and the price against the day's gold rate, and deliver insured anywhere in Pakistan at no charge.",
  },
  {
    q: "How long does a bridal set take?",
    a: "Within ten days. Bridal work is made to order. We send photographs through the making so nothing is a surprise at the end. If your wedding is sooner than that, tell us the date and we will be honest about what is possible.",
  },
  {
    q: "How is the price calculated?",
    a: "Gold value plus making charges plus the value of any stones. The gold value is the net metal weight multiplied by the day's rate for that karat. Every product page shows the three parts separately, and the final price is confirmed at the counter on the day you buy.",
  },
  {
    q: "Can I exchange or sell a piece back?",
    a: "Yes. Bring the piece and its bill and we buy it back against the gold rate on the day you return, not the day you bought it. Making charges are not returned, which is standard across the trade.",
  },
  {
    q: "Can rings be resized?",
    a: "Yes, and sizing is adjusted in store at no charge. For a ring bought as a gift, come in with the recipient afterwards and we will fit it properly.",
  },
] as const;
