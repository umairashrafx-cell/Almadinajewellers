import type { SVGProps } from "react";

/**
 * Line drawings of the pieces people bring in to sell.
 *
 * Drawn here rather than borrowed: the icon sets the site already uses have
 * rings and gems but no bangle, no chain, no single earring — and a jeweller's
 * page that illustrates a bangle with a circle reads as a template.
 *
 * Same 24-unit grid, stroke and caps as the lucide icons beside them, so the
 * two families sit together without either looking borrowed. Decorative
 * everywhere they are used: the card names the piece in text.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function RingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="15" r="6.25" />
      <path d="M9.6 8.9 12 4.6l2.4 4.3" />
      <path d="M9.6 8.9h4.8" />
    </Icon>
  );
}

export function ChainIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.6" y="8.6" width="8.6" height="5" rx="2.5" transform="rotate(-35 6.9 11.1)" />
      <rect x="7.7" y="9.7" width="8.6" height="5" rx="2.5" transform="rotate(-35 12 12.2)" />
      <rect x="12.8" y="10.8" width="8.6" height="5" rx="2.5" transform="rotate(-35 17.1 13.3)" />
    </Icon>
  );
}

export function BangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="5.6" />
      <ellipse cx="12" cy="12" rx="6.4" ry="3.4" />
    </Icon>
  );
}

export function NecklaceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 3.5c0 6.9 3.6 11 8 11s8-4.1 8-11" />
      <path d="M12 14.5v1.4" />
      <path d="m12 15.9-2.1 2.8L12 21.5l2.1-2.8Z" />
    </Icon>
  );
}

export function BrokenGoldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M16.6 6.9A6.75 6.75 0 1 0 18.7 13" />
      <path d="m19.1 6.2 1.5-1.2" />
      <path d="m19.8 9.4 1.9-.1" />
      <path d="m18.4 3.9.4-1.6" />
    </Icon>
  );
}

export function EarringIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9.6 5.2a2.6 2.6 0 1 1 3.4 2.5V10" />
      <circle cx="13" cy="11.4" r="1.4" />
      <path d="M13 12.8c-2.3 2.2-3.1 3.8-3.1 5.2a3.1 3.1 0 0 0 6.2 0c0-1.4-.8-3-3.1-5.2Z" />
    </Icon>
  );
}

export function GoldBarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3.4 19.5 5 14.8h5.6l1.6 4.7Z" />
      <path d="M11.8 19.5 13.4 14.8H19l1.6 4.7Z" />
      <path d="M7.6 13.2 9.2 8.5h5.6l1.6 4.7Z" />
    </Icon>
  );
}
