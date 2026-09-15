import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

import { SITE, STORES, whatsappLink } from "@/lib/site";

/** Change this whenever a section below changes. */
const LAST_UPDATED = "16 September 2026";

export const Route = createFileRoute("/privacy-policy")({
  head: () => {
    const title = `Privacy Policy — ${SITE.name}`;
    const description =
      "What Al-Madina Jewellers collects through its website and Android app, why, who can see it, and how to ask for it to be deleted.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/privacy-policy` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/privacy-policy` }],
    };
  },
  component: PrivacyPolicyPage,
});

/**
 * The privacy policy, for the website and the Android app alike.
 *
 * Written from what the code actually does, not from a template: every item
 * under "What we collect" corresponds to a form or a feature on this site, and
 * nothing is listed that the site does not do. When a form gains a field, or a
 * tracking tool is switched on, this page has to change with it — and so does
 * the Data safety form in the Play Console, which must match it.
 */

type Section = { id: string; title: string; body: React.ReactNode };

const store = STORES[0];
const phone = SITE.phones[0];

const SECTIONS: Section[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {SITE.name} is a family jewellery shop at {store?.address ?? SITE.address}. This policy
          covers our website, {SITE.origin.replace("https://", "")}, and our Android app, which
          shows the same website. When it says “we”, it means the shop.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>
          You can browse the catalogue, check the gold rate and use the calculators without telling
          us your name or your number. Everything below is information you choose to send us; the
          one thing collected automatically is website statistics, described under{" "}
          <a href="#other-services" className="underline underline-offset-4">
            other services our pages use
          </a>
          .
        </p>
        <ul>
          <li>
            <strong>Contact and bridal consultation forms</strong> — your name and phone number,
            and, if you add them, your email address, city, wedding date, budget range, preferred
            time to be called and your message.
          </li>
          <li>
            <strong>Custom order form</strong> — your name and phone number, and, if you add them,
            your city, the kind of piece, its size, a description, a photograph and a voice note.
            The microphone is only used while you are pressing record, and only after you allow it.
          </li>
          <li>
            <strong>Order requests from your bag</strong> — your name, phone number, city and any
            notes, together with the pieces you chose and the prices quoted to you.
          </li>
          <li>
            <strong>Reviews</strong> — your name, city, rating and review, and an order reference if
            you give one. Once we approve a review, your name, city, rating and review are shown on
            the piece&rsquo;s page. The order reference is never published.
          </li>
          <li>
            <strong>Newsletter</strong> — your email address, if you sign up on the home page. We
            use it only to send that newsletter.
          </li>
        </ul>
        <p>
          Your <strong>wishlist and bag</strong> are saved only on your own device. They are not
          sent to us unless you place an order request.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: (
      <>
        <p>
          We use what you send to reply to you: to call or message you back, to prepare a quote or a
          custom piece, to arrange a consultation, and to check and publish reviews. If you sign up
          for the newsletter, we use your email address to send it. We do not sell your information,
          and we do not use it to show you advertising.
        </p>
      </>
    ),
  },
  {
    id: "who-can-see-it",
    title: "Who can see it and where it is kept",
    body: (
      <>
        <p>
          Enquiries, orders, reviews and attachments are stored with Supabase, the database service
          our website runs on. Photographs and voice notes are kept in private storage, not on a
          public web address. Only shop staff can see them, through a password-protected staff area.
          When a new enquiry arrives, its details may be sent to shop staff by email so it is not
          missed.
        </p>
        <p>The website itself is hosted by Vercel.</p>
      </>
    ),
  },
  {
    id: "other-services",
    title: "Other services our pages use",
    body: (
      <>
        <ul>
          <li>
            <strong>WhatsApp and phone calls.</strong> Buttons that say WhatsApp or Call open the
            WhatsApp app or your phone&rsquo;s dialler. Anything you send there is handled by
            WhatsApp under its own privacy policy.
          </li>
          <li>
            <strong>Google Maps.</strong> The map on our Stores page is loaded from Google, which
            receives your device&rsquo;s address and browser details when the map is shown.
          </li>
          <li>
            <strong>Google Fonts.</strong> Our typefaces are loaded from Google, which receives the
            same basic connection details.
          </li>
          <li>
            <strong>Google Analytics.</strong> In use on this website and in our app. It counts
            visits and shows which pages are read. It sets cookies and receives the pages you visit,
            roughly where you are, and details of your device and browser, and it is covered by
            Google&rsquo;s own privacy policy. It never receives your name, phone number or anything
            you type into a form.
          </li>
          <li>
            <strong>Meta Pixel.</strong> Also in use. It tells us how many people reached the
            website from our Facebook and Instagram posts, and lets us show our jewellery to people
            who have visited before. It sets cookies and sends Meta the pages you visit and details
            of your device, under Meta&rsquo;s own privacy policy. It never receives your name,
            phone number or anything you type into a form.
          </li>
          <li>
            <strong>Turning these off.</strong> Both can be blocked in your browser or phone
            settings — private browsing, a tracker blocker, or the &ldquo;do not track&rdquo; and
            ad-personalisation settings in your Google and Meta accounts. Nothing on this website
            stops working if you block them.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-long",
    title: "How long we keep it",
    body: (
      <p>
        We keep enquiry and order details for as long as we need them to deal with your request and
        to keep our business records. You can ask us to delete them at any time, as described below.
      </p>
    ),
  },
  {
    id: "your-choices",
    title: "Seeing, correcting or deleting your information",
    body: (
      <>
        <p>
          You can ask us what we hold about you, ask us to correct it, or ask us to delete it —
          including a photograph, voice note or review you sent, or your email address on the
          newsletter list. Contact us by phone, on WhatsApp or through our contact page, tell us the
          name and phone number you used, and we will do it. We may ask you to confirm the request
          from that phone number before deleting anything.
        </p>
        <p>
          You do not need an account to use our website or app, so there is no account to delete.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Our website and app are meant for adults. We do not knowingly collect information from
        children. If you believe a child has sent us their details, contact us and we will delete
        them.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Our website and app only connect over encrypted (HTTPS) connections, and access to what you
        send us is limited to shop staff. No system is perfectly secure, but we take reasonable care
        to protect your information.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change what we collect or how we use it, we will update this page and the date at the
        top of it.
      </p>
    ),
  },
];

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Privacy Policy
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              What we collect through our website and app, why, and how to ask us to delete it.
            </p>
            <p className="nums mt-6 text-xs uppercase tracking-widest text-champagne/70">
              Last updated {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="section-y mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="On this page" className="border-b border-gold/30 pb-6">
            <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] uppercase tracking-widest text-warmgrey">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="transition-colors hover:text-primary">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-16 space-y-14">
            {SECTIONS.map((section) => (
              <Reveal key={section.id} as="article">
                <h2
                  id={section.id}
                  className="scroll-mt-28 font-display text-3xl font-light tracking-wide text-primary"
                >
                  {section.title}
                </h2>
                <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink/85 [&_li]:border-l [&_li]:border-gold/40 [&_li]:pl-5 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:space-y-4">
                  {section.body}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 border border-gold/40 bg-champagne/20 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-light text-primary">
              Contact us about privacy
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
              {SITE.name}, {store?.address ?? SITE.address}
              {phone ? (
                <>
                  <br />
                  Phone:{" "}
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="nums text-primary underline underline-offset-4"
                  >
                    {phone}
                  </a>
                </>
              ) : null}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ActionLink
                href={whatsappLink(
                  "Assalam-o-Alaikum, I have a question about my information and your privacy policy.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp us
              </ActionLink>
              <ActionLink variant="outline" href="/contact">
                Contact page
              </ActionLink>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
