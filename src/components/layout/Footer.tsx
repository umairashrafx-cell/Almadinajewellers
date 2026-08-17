import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Collections",
    links: ["Bridal Sets", "Gold Bangles", "Rings", "Earrings", "Lockets & Chains", "Silver Essentials"],
  },
  {
    title: "Information",
    links: ["Our Story", "Gold Rate", "Certification & Hallmarking", "Buy-Back Policy", "Delivery", "Contact"],
  },
];

/** Deep forest footer with four columns. */
export function Footer() {
  return (
    <footer className="bg-primary-deep text-champagne">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                {col.title}
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-champagne/75">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link to="/" className="transition-colors hover:text-gold">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">Visit Us</h3>
            <address className="mt-6 space-y-2 text-sm not-italic text-champagne/75">
              <p>{SITE.address}</p>
              <p className="nums">Mon – Sat, 11:00 – 21:00</p>
              {SITE.phones.map((p) => (
                <p key={p} className="nums">
                  {p}
                </p>
              ))}
            </address>
          </div>

          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">Connect</h3>
            <ul className="mt-6 space-y-3 text-sm text-champagne/75">
              <li>
                <a
                  href={`https://wa.me/${SITE.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold nums"
                >
                  WhatsApp {SITE.whatsappDisplay}
                </a>
              </li>
              <li>
  <a href={SITE.tiktok} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold nums">
    Tiktok
  </a>
</li>
<li>
  <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold nums">
    Instagram
  </a>
</li>
<li>
  <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold nums">
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

        <div className="mt-8 flex flex-col gap-3 text-xs text-champagne/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="nums">
            © {new Date().getFullYear()} {SITE.name}. Founded by {SITE.founder}.
          </p>
          <p className="font-display text-base tracking-wide text-gold">{SITE.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
