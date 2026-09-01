import { BadgeCheck, Gem, RefreshCcw, Truck } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const ITEMS = [
  { Icon: BadgeCheck, label: "Hallmarked 22K Gold" },
  { Icon: Gem, label: "925 Certified Silver" },
  { Icon: RefreshCcw, label: "Lifetime Buy-Back" },
  { Icon: Truck, label: "Insured Nationwide Delivery" },
];

/** Four thin-icon trust points below the hero. */
export function TrustStrip() {
  return (
    <section className="bg-ivory">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {ITEMS.map(({ Icon, label }, i) => (
            <Reveal
              as="li"
              key={label}
              delay={i * 80}
              className="flex flex-col items-center gap-3 text-center"
            >
              <Icon className="h-6 w-6 text-gold" strokeWidth={1} />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-warmgrey">
                {label}
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>
    </section>
  );
}
