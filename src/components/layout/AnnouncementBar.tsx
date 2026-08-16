import { SITE } from "@/lib/site";

/** Slim green bar above the header. */
export function AnnouncementBar() {
  return (
    <div className="bg-primary text-ivory">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[11px] tracking-widest sm:px-6 lg:px-8">
        <p className="uppercase">{SITE.announcement}</p>
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-champagne transition-colors hover:text-gold nums"
        >
          WhatsApp {SITE.whatsappDisplay}
        </a>
      </div>
    </div>
  );
}
