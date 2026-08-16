import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (80ms per grid child is the house standard). */
  delay?: number;
  as?: "div" | "section" | "li" | "article";
};

/** Fade-up 24px scroll reveal wrapper. Restrained, 500ms ease-out. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", shown && "reveal-in", className)}
    >
      {children}
    </Tag>
  );
}
