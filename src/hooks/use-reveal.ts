import { useEffect, useRef, useState } from "react";

/**
 * Reveals an element once it scrolls into view.
 * Returns a ref to attach and a boolean for the "revealed" state.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fail open. The reveal is decoration; the content is not. Without this, a
    // browser with no IntersectionObserver leaves every revealed section at
    // opacity 0 permanently — the animation failing would take the page with it.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, shown };
}
