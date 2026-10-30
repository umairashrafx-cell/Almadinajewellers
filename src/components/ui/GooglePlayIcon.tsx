import type { SVGProps } from "react";

/**
 * The Google Play mark.
 *
 * Drawn in currentColor rather than Play's four brand colours, for the same
 * reason WhatsAppIcon is: these sit in a row of quiet monochrome icons, and one
 * full-colour glyph among them would be the loudest thing in the header. The
 * triangle is recognisable on its own at the sizes used here.
 *
 * This is not the official "Get it on Google Play" badge, which Google supplies
 * as fixed artwork and asks not be redrawn. Anywhere this icon carries a label,
 * the label says where the link goes.
 */
export function GooglePlayIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202c1.072.607 1.072 2.009 0 2.594zM1.337.924a1.86 1.86 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}
