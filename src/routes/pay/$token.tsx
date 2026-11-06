import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, ShieldCheck } from "lucide-react";

import { PageShell } from "@/components/page/PageShell";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

import {
  fetchPaymentIntent,
  handOffToProvider,
  startPayment,
  type PaymentIntent,
} from "@/lib/payments";
import { EASYPAISA, SITE, formatPKR, whatsappLink } from "@/lib/site";

/**
 * Paying for an order the shop has priced.
 *
 * Reached only from a link the shop sends on WhatsApp, never from the site's
 * own navigation, because the figure on it exists only after a piece has been
 * weighed and a rate agreed. That is also why the page is addressed by a
 * random token rather than by the order reference: the reference is
 * sequential and meant to be read aloud, which makes it the wrong thing to
 * put in a URL that shows someone's order.
 *
 * Nothing here decides an amount or an outcome. The figure is displayed from
 * the database and sent from the Edge Function, and "paid" arrives from
 * Easypaisa's server, not from the customer's browser coming back.
 */
export const Route = createFileRoute("/pay/$token")({
  head: () => ({
    meta: [
      { title: `Pay for your order — ${SITE.name}` },
      // One customer's order, behind a secret URL. Nothing for a search engine.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ params }) => fetchPaymentIntent(params.token).catch(() => null),
  component: PayPage,
});

function PayPage() {
  const intent = Route.useLoaderData();
  const { token } = Route.useParams();

  if (!intent) return <Unusable />;
  if (intent.status === "paid") return <AlreadyPaid intent={intent} />;

  return <Payable intent={intent} token={token} />;
}

/** The frame every state below sits in. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      {/* pb-24: the floating WhatsApp button sits over this corner. */}
      <section className="section-y mx-auto max-w-xl px-4 pb-24 sm:px-6">{children}</section>
    </PageShell>
  );
}

function Unusable() {
  return (
    <Sheet>
      <h1 className="font-display text-3xl font-light tracking-wide text-forest">
        This payment link is not valid
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-warmgrey">
        It may have been mistyped, or the order may not have been priced yet. Send us the order
        reference on WhatsApp and we will check it for you.
      </p>
      <ActionLink
        href={whatsappLink("Assalam-o-Alaikum, my payment link is not working.")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Ask on WhatsApp
      </ActionLink>
    </Sheet>
  );
}

function AlreadyPaid({ intent }: { intent: PaymentIntent }) {
  return (
    <Sheet>
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold">
        <Check className="h-4 w-4" /> Paid
      </p>
      <h1 className="mt-4 font-display text-3xl font-light tracking-wide text-forest">
        Order {intent.reference} is paid
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-warmgrey">
        {formatPKR(intent.amountPkr)} received. We will confirm dispatch on WhatsApp. Keep the
        reference — it is the one to quote if you call the shop.
      </p>
    </Sheet>
  );
}

function Payable({ intent, token }: { intent: PaymentIntent; token: string }) {
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  /*
   * Set by Easypaisa sending the customer back. "returned" is not "paid":
   * the money is confirmed to us by their server, which may land a moment
   * after the browser does, so this page says what it honestly knows.
   */
  // Read after mount rather than during render: the server has no query
  // string, so reading it inline would render one thing there and another
  // here, and hydration would tear.
  const [state, setState] = useState<string | null>(null);
  useEffect(() => {
    setState(new URLSearchParams(window.location.search).get("state"));
  }, []);

  async function pay() {
    setFailed(null);
    setLeaving(true);
    try {
      handOffToProvider(await startPayment(token));
    } catch (error) {
      setFailed(error instanceof Error ? error.message : "Something went wrong.");
      setLeaving(false);
    }
  }

  return (
    <Sheet>
      <p className="text-[11px] uppercase tracking-[0.2em] text-warmgrey">
        Order {intent.reference}
      </p>
      <h1 className="mt-4 font-display text-3xl font-light tracking-wide text-forest">
        Pay for your order
      </h1>

      {state === "returned" && (
        <p className="mt-6 rounded-[2px] border border-gold/45 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-forest">
          Thank you. Easypaisa is confirming the payment with us — this page will show it as paid
          once they do, usually within a minute or two. Nothing more is needed from you.
        </p>
      )}
      {state === "failed" && (
        <p className="mt-6 rounded-[2px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-forest">
          That payment was not completed, and nothing has been charged. You can try again below.
        </p>
      )}

      <ul className="mt-8 divide-y divide-forest/10 border-y border-forest/10">
        {intent.items.map((line) => (
          <li key={line.name} className="flex justify-between gap-4 py-3 text-sm text-forest">
            <span>{line.name}</span>
            <span className="text-warmgrey">×{line.quantity}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-warmgrey">Agreed total</span>
        <span className="font-display text-3xl font-light text-forest">
          {formatPKR(intent.amountPkr)}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-warmgrey">
        The figure we agreed for this order. If it does not match what you were told, stop and ask
        us on WhatsApp before paying.
      </p>

      {failed && <p className="mt-6 text-sm text-destructive">{failed}</p>}

      <ActionButton type="button" onClick={pay} disabled={leaving} className="mt-8 w-full">
        {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {leaving ? "Taking you to Easypaisa…" : `Pay ${formatPKR(intent.amountPkr)} with Easypaisa`}
      </ActionButton>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-warmgrey">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        You pay on Easypaisa's own page. No card or account details are entered on this website —
        there is nothing here to take them.
      </p>

      {/*
        Scanning, for the customer whose app works but whose handoff does not:
        a bank that refuses the redirect, an in-app browser that loses the
        page, or somebody who simply trusts the Easypaisa app more than a web
        page asking for money.

        It is deliberately second, and deliberately says what it costs. The
        button above is settled by Easypaisa's server talking to ours, so the
        order moves to paid with nobody doing anything. A scan sends no such
        message — nothing at all reaches this site — so this page will sit on
        the same screen however long the customer waits on it, and somebody at
        the counter has to match the receipt by hand. Saying so outright is the
        whole difference between a slower way to pay and a page that looks
        broken after you have already sent the money.

        The reference is here because it is the only thing tying a transfer to
        an order once it arrives: an Easypaisa receipt carries a figure and a
        time, and on a day with two bridal sets at a similar weight that is not
        enough to tell which is which.

        It is gone once Easypaisa has sent the customer back, because at that
        moment a payment is already in flight and this page cannot yet see it.
        Offering a second way to pay there is an invitation to pay twice, and an
        Easypaisa transfer does not come back: it would have to be refunded by
        hand, from the till, by somebody who first worked out that it happened.
        The banner above says what is going on instead.
      */}
      {state !== "returned" && (
        <div className="mt-10 border-t border-gold/20 pt-8">
          <h2 className="font-display text-lg font-light tracking-wide text-primary">
            Or pay by scanning, in the Easypaisa app
          </h2>

          <p className="mt-3 text-xs leading-relaxed text-warmgrey">
            Send the exact figure below to the shop's own Easypaisa account, then send us the
            receipt. This way is checked by hand at the counter, so{" "}
            <strong className="font-semibold text-ink">
              this page will not change once you pay
            </strong>{" "}
            — we confirm on WhatsApp instead, the same day.
          </p>

          {/*
            The card runs the full width of the column rather than sitting in a
            thumbnail beside the figures. It is landscape, and the code itself is
            under a third of it — boxed into a square it would render at about
            fifty pixels, which is a picture of a QR rather than one anybody's
            camera can read.

            The number is printed again underneath it even though the card
            carries its own. The card's digits are small on a phone and are a
            photograph of a number; the ones below are text, they line up under
            tabular figures, and they go to the clipboard with the amount and the
            reference. Having both also lets a customer check one against the
            other, which on a page asking for money is worth the repetition.
          */}
          <div className="mt-6 overflow-hidden border border-gold/25 bg-white/70">
            {EASYPAISA.qr ? (
              <img
                src={EASYPAISA.qr}
                alt={`Easypaisa payment card for ${SITE.name}, merchant till number ${EASYPAISA.till}`}
                width={1080}
                height={675}
                className="block w-full border-b border-gold/20"
              />
            ) : null}

            <dl className="w-full p-5">
              <dt className="text-[11px] tracking-[0.2em] text-warmgrey uppercase">
                Merchant till number
              </dt>
              <dd className="nums mt-1 text-xl tracking-wider text-primary">{EASYPAISA.till}</dd>

              <dt className="mt-4 text-[11px] tracking-[0.2em] text-warmgrey uppercase">
                Amount to send
              </dt>
              <dd className="nums mt-1 text-xl text-primary">{formatPKR(intent.amountPkr)}</dd>

              <dt className="mt-4 text-[11px] tracking-[0.2em] text-warmgrey uppercase">
                Reference to quote
              </dt>
              <dd className="nums mt-1 text-sm text-ink">{intent.reference}</dd>
            </dl>
          </div>

          <CopyTextButton
            variant="outline"
            className="mt-4 w-full"
            text={`${SITE.name} — Easypaisa till ${EASYPAISA.till}, ${formatPKR(
              intent.amountPkr,
            )}, order ${intent.reference}`}
            label="Copy these details"
            announce="Payment details copied to the clipboard"
          />

          <ActionLink
            variant="outline"
            href={whatsappLink(
              `Assalam-o-Alaikum. I have sent ${formatPKR(intent.amountPkr)} on Easypaisa for order ${intent.reference}. I will attach the receipt.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Send the receipt on WhatsApp
          </ActionLink>
        </div>
      )}
    </Sheet>
  );
}
