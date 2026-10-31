import { Clock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";

import { SITE, STORES, directionsUrl, placeUrl, whatsappLink } from "@/lib/site";

/**
 * Where the shop is, written down on the phone.
 *
 * Nothing on this screen is fetched. The branch, its hours and its numbers
 * come from the same config the website is built from, which means they are in
 * the APK and readable in a basement, in a bazaar, on a train — wherever
 * somebody has stopped needing a website and started needing an address.
 *
 * The Friday closure is said twice over, once in the hours and once on its own
 * line, because a wasted trip is the one thing this screen exists to prevent.
 */
export function StoreScreen() {
  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="font-display text-2xl font-light tracking-wide text-primary">The shop</h1>
      <div className="hairline mt-5 max-w-24" />

      <p className="mt-5 text-sm leading-relaxed text-warmgrey">
        {SITE.proprietor}, serving Mandi Bahauddin since {SITE.founded}.
      </p>

      <div className="mt-7 grid gap-6">
        {STORES.map((store) => (
          <Branch key={store.name} store={store} />
        ))}
      </div>
    </div>
  );
}

function Branch({ store }: { store: (typeof STORES)[number] }) {
  return (
    <section className="border border-gold/25 bg-white/70">
      <header className="border-b border-gold/20 px-4 py-4">
        <h2 className="font-display text-xl font-light tracking-wide text-primary">{store.name}</h2>
        <p className="mt-1 text-[11px] tracking-widest text-warmgrey uppercase">{store.city}</p>
      </header>

      <dl className="divide-y divide-gold/15">
        <Line icon={MapPin} label="Address">
          {store.address}
        </Line>

        <Line icon={Clock} label="Hours">
          {store.hours}
          <span className="mt-1 block font-semibold text-ink">{store.closed}</span>
        </Line>

        <Line icon={Phone} label={store.phones.length > 1 ? "Phones" : "Phone"}>
          {store.phones.map((phone) => (
            <a
              key={phone}
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="block py-0.5 text-ink underline decoration-gold/50 underline-offset-4"
            >
              {phone}
            </a>
          ))}
        </Line>
      </dl>

      {/*
        Both of these leave the app, which is what they are for: Capacitor hands
        a tel:, a wa.me or a maps link to whatever the phone uses for it, since
        neither host is in allowNavigation.
      */}
      <div className="grid gap-3 px-4 py-5">
        <a
          href={directionsUrl(store.mapQuery, store.placeId)}
          className="inline-flex w-full items-center justify-center gap-2 bg-gold px-7 py-3.5 text-[12px] font-semibold tracking-widest text-primary uppercase transition-colors hover:bg-gold-deep"
        >
          <Navigation className="h-4 w-4" aria-hidden />
          Directions
        </a>

        <a
          href={whatsappLink("Assalam-o-Alaikum, I have a question about your jewellery.")}
          className="inline-flex w-full items-center justify-center gap-2 border border-gold px-7 py-3.5 text-[12px] font-semibold tracking-widest text-ink uppercase transition-colors hover:bg-champagne/50"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          WhatsApp
        </a>

        <a
          href={placeUrl(store.placeId)}
          className="pt-1 text-center text-[11px] tracking-widest text-warmgrey uppercase underline decoration-gold/40 underline-offset-4"
        >
          Reviews and photographs
        </a>
      </div>
    </section>
  );
}

function Line({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 px-4 py-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] tracking-widest text-warmgrey uppercase">{label}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-ink">{children}</dd>
      </div>
    </div>
  );
}
