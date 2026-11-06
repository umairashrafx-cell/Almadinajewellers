import { useEffect, useState } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { SITE, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * How far the page must have moved before the button joins it, in pixels.
 *
 * The button and its pulse ring occupy about ninety pixels of the bottom-right
 * corner, so anything the arrival view had put there has cleared that band by
 * this point. Small enough that a single flick of a thumb brings the button
 * back, large enough that it does not flicker in and out while somebody is
 * nudging a page a few pixels to read it.
 */
const SHOW_AFTER_PX = 120;

/**
 * Gold circular WhatsApp button, fixed bottom-right on every page.
 *
 * On a phone it keeps off the first screen and arrives once the page has been
 * scrolled. A fixed circle in the bottom-right corner of a 375px layout always
 * sits inside the text column — there is no gutter to put it in — so the
 * question is never whether it covers something but what, and when.
 *
 * Measured across the nine public routes at 375x812, on arrival, it covered:
 * the "Bridal Sets" link on /collections and the first card's ENQUIRE button
 * on /collections/bridal-sets, both of them live controls a thumb would be
 * reaching for; the product's own name on /products/:slug; and the "Nothing
 * chosen yet" message on /cart together with the wishlist's empty-state
 * instruction — which is to say, on two pages it buried the one sentence that
 * tells a lost customer what to do next.
 *
 * Every one of those was an arrival overlap. Nothing had been scrolled past,
 * so nothing could be scrolled back to: the circle was simply sitting on the
 * first impression. Once the page moves, the same circle floating over the
 * middle of a long page is the ordinary cost of a floating button, and that is
 * left as it was.
 *
 * Waiting costs the shop nothing, because WhatsApp is not only here: the
 * announcement bar carries the number and the header carries the same icon,
 * both of them on the first screen of every page, above whatever this button
 * was covering.
 *
 * Phones only. From 640px up the circle sits in the margin beside the content
 * and overlaps nothing, so there is nothing to wait for.
 */
export function FloatingWhatsApp() {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const read = () => {
      /*
       * A page shorter than the threshold can never pass it, and a customer on
       * one would be left with no button at all. Those pages show it at once:
       * they are short enough that the corner is empty anyway.
       */
      const room = document.documentElement.scrollHeight - window.innerHeight;
      setMoved(window.scrollY > SHOW_AFTER_PX || room <= SHOW_AFTER_PX);
    };

    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);

    /*
     * The page grows as its photographs land, which is what decides whether
     * there is room to scroll at all — a wishlist with two pieces in it is a
     * different height a second after it opens.
     */
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
    observer?.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      observer?.disconnect();
    };
  }, []);

  return (
    <a
      href={whatsappLink(`Assalam-o-Alaikum, I would like to know more about ${SITE.name}.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "pulse-gold fixed right-6 bottom-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold text-primary shadow-[var(--shadow-lift)] transition-[transform,opacity] duration-300 hover:scale-105",
        /*
         * invisible rather than opacity alone, so a keyboard cannot land on a
         * circle nobody can see and a screen reader is not offered a third
         * WhatsApp link that is not on the screen.
         */
        !moved && "max-sm:invisible max-sm:translate-y-3 max-sm:opacity-0",
      )}
    >
      <WhatsAppIcon className="relative h-6 w-6" />
    </a>
  );
}
