import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { SITE, whatsappLink } from "@/lib/site";

/** Gold circular WhatsApp button, fixed bottom-right on every page. */
export function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink(`Assalam-o-Alaikum, I would like to know more about ${SITE.name}.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="pulse-gold fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold text-primary shadow-[var(--shadow-lift)] transition-transform duration-300 hover:scale-105"
    >
      <WhatsAppIcon className="relative h-6 w-6" />
    </a>
  );
}
