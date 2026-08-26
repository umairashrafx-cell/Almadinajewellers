import { Link } from "@tanstack/react-router";

import footerTexture from "@/assets/footer-texture.jpg";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { SITE, whatsappLink } from "@/lib/site";

/**
 * Footer navigation. Every entry resolves to a real page — the policy links
 * point at the section that actually answers them rather than at stub pages.
 */
const COLUMNS = [
  {
    title: "Collections",
    links: [
      { label: "Bridal Sets", to: "/collections/bridal-sets" },
      { label: "Gold Bangles", to: "/collections/gold-bangles" },
      { label: "Rings", to: "/collections/rings" },
      { label: "Earrings", to: "/collections/earrings" },
      { label: "Lockets & Chains", to: "/collections/lockets-chains" },
      { label: "Silver Essentials", to: "/collections/silver-essentials" },
    ],
  },
  {
    title: "Information",
    links: [
      { label: "Our Story", to: "/our-story" },
      { label: "Our Founder", to: "/our-story/founder" },
      { label: "Gold Rate", to: "/gold-rate" },
      { label: "Sell Your Gold", to: "/sell-your-gold" },
      { label: "Certification & Hallmarking", to: "/our-story#standards" },
      { label: "Buy-Back & Exchange", to: "/policies#exchange" },
      { label: "Delivery & Payment", to: "/policies#delivery" },
      { label: "Contact", to: "/contact" },
    ],
  },
];

/** Deep forest footer with four columns, over a photographic ground. */
export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-primary-deep text-champagne">
      {/*
        The photograph is held back rather than shown at full strength. It is a
        bright, cream-lit picture and every word here is light on dark, so the
        two are working against each other.

        26% is measured, not guessed: rasterising the real composite — image,
        opacity and gradient — and sampling under each piece of text puts the
        weakest element at 5.7:1 against the brightest pixel behind it. The
        photograph stays legible as a photograph, and nothing in the footer
        drops under AA. Raising it costs contrast quickly: 35% leaves only
        5.1:1, which is too little room for a background.
      */}
      <img
        src={footerTexture}
        alt=""
        aria-hidden="true"
        width={2000}
        height={1333}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.26]"
      />
      {/*
        Deepest at the top edge, so the footer still separates cleanly from
        whatever section ends above it rather than starting mid-photograph.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, var(--primary-deep) 0%, oklch(0.16 0.035 160 / 0.55) 30%, oklch(0.16 0.035 160 / 0.45) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                {col.title}
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-champagne/75">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {/* Anchor links need a plain <a>; Link would not scroll to the hash. */}
                    {l.to.includes("#") ? (
                      <a href={l.to} className="transition-colors hover:text-gold">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className="transition-colors hover:text-gold">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
              Visit Us
            </h3>
            <address className="mt-6 space-y-2 text-sm not-italic text-champagne/75">
              <p>{SITE.address}</p>
              <p className="nums">Mon – Sun, 11:00am – 8:00pm </p>
              {SITE.phones.map((phone) => (
                <p key={phone}>
                  <a
                    // Strip spaces: a dialler will not parse "+92 321 7759959".
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="nums transition-colors hover:text-gold"
                  >
                    {phone}
                  </a>
                </p>
              ))}
            </address>
          </div>

          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
              Connect
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-champagne/75">
              <li>
                <a
                  href={whatsappLink(
                    `Assalam-o-Alaikum, I would like to know more about ${SITE.name}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 transition-colors hover:text-gold"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold transition-colors group-hover:bg-gold group-hover:text-primary">
                    <WhatsAppIcon className="h-4 w-4" />
                  </span>
                  <span className="nums">{SITE.whatsappDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold nums"
                >
                  Tiktok
                </a>
              </li>
              <li>
                <a
                  href={SITE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold nums"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={SITE.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold nums"
                >
                  Facebook
                </a>
              </li>
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-champagne/60">
              Every piece is hallmarked and weighed in front of you. Payment is arranged in store or
              on confirmed delivery.
            </p>
          </div>
        </div>

        <div className="hairline mt-16" />

        <div className="mt-8 flex flex-col gap-4 text-xs text-champagne/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="nums">
            © {new Date().getFullYear()} {SITE.name}
          </p>

          <p className="font-display text-base tracking-wide text-gold sm:order-2">
            {SITE.tagline}
          </p>

          {/* Build credit, kept quiet and last in the reading order. */}
          <p className="sm:order-3">
            Project built by{" "}
            <a
              href="https://www.automa8.co"
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-champagne/30 pb-0.5 transition-colors hover:border-gold hover:text-gold"
            >
              Automa8
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
