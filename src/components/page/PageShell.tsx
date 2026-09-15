import type { ReactNode } from "react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

/**
 * The public page frame: announcement bar, header, the page, footer and the
 * floating WhatsApp button.
 *
 * Every existing page assembles these five by hand. New pages use this instead,
 * so the frame is decided in one place and a page cannot forget a piece of it.
 * The existing pages are left as they are.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
