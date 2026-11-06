import { SITE } from "@/lib/site";

/** Slim green bar above the header. */
export function AnnouncementBar() {
  return (
    <div className="bg-primary text-ivory">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[11px] tracking-widest sm:px-6 lg:px-8">
        <p className="uppercase">{SITE.announcement}</p>
        {/*
          tap-44: the number is 11px type, seventeen pixels tall, and this
          strip sits on every page. Giving the link real height would push the
          bar down the page each time — and at 375px, where the message beside
          it wraps to three lines, the bar is already sixty-six pixels of
          every screen. The target reaches out to 44 instead; the strip does
          not move, and the one thing on it a thumb is meant to hit is now big
          enough to hit. Nothing else in the bar takes a tap.
        */}
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-44 whitespace-nowrap text-champagne transition-colors hover:text-gold nums"
        >
          WhatsApp {SITE.whatsappDisplay}
        </a>
      </div>
    </div>
  );
}
