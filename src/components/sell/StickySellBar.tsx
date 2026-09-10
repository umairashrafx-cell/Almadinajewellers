import { useEffect, useState } from "react";

import { ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { cn } from "@/lib/utils";

/**
 * The two things a phone visitor wants within reach, pinned to the bottom.
 *
 * Phones only. From md up, both actions sit in view in the hero and the
 * floating WhatsApp button covers the rest.
 *
 * It steps aside once the closing section reaches the screen and stays away
 * below it: from there the page has the same buttons at full size, and the
 * footer underneath has nothing the bar should sit on top of. Made inert while
 * hidden, so nobody can tab into buttons that are not there.
 *
 * The bottom padding clears the iPhone home indicator.
 */
export function StickySellBar({
  whatsappHref,
  watchId,
}: {
  whatsappHref: string;
  watchId: string;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0);
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      role="region"
      aria-label="Quick actions"
      inert={hidden}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 bg-ivory/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-18px_rgb(0_0_0/0.35)] backdrop-blur-sm transition-[transform,opacity] duration-300 motion-reduce:transition-none md:hidden",
        hidden && "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        <ActionLink
          variant="outline"
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 px-3"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </ActionLink>
        <ActionLink href="#calculator" className="h-12 px-3">
          Calculate Value
        </ActionLink>
      </div>
    </div>
  );
}
