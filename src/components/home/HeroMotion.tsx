import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import heroMotion from "@/assets/video/hero-motion.mp4";
import heroMotionPoster from "@/assets/video/hero-motion-poster.jpg";

/** Where the film is on screen at all: portrait screens, and wide landscape ones. */
const SHOWN = "(orientation: portrait), (min-width: 1280px)";

/**
 * The homepage film: eight seconds of a pendant set in close-up.
 *
 * It is a portrait film, so it is shown in the two places a portrait film
 * belongs. On a phone or an upright tablet it fills the hero behind the
 * headline. On a wide landscape screen it stands in a gold-edged arch beside
 * the headline, over the still photograph — stretched across a laptop it would
 * lose two thirds of the frame. On a landscape screen too narrow for the arch,
 * it is not shown and never downloaded.
 *
 * It costs nothing until it plays. The element is served with preload="none"
 * and a poster, so the page arrives with a still image; the film is only
 * fetched and started once the browser confirms it is on screen, motion is
 * welcome and the visitor has not asked to save data. It pauses when scrolled
 * away, and a button pauses it outright — a film that loops for longer than
 * five seconds beside other content has to offer that.
 *
 * Decorative, so it is hidden from assistive technology; the hero's headline
 * says what the page is.
 */
export function HeroMotion() {
  const video = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const sync = useRef<() => void>(() => {});
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;

    const shown = window.matchMedia(SHOWN);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
      true;
    let onScreen = true;

    const update = () => {
      const allowed = shown.matches && !calm.matches && !saveData;
      setLive(allowed);
      if (allowed && onScreen && !userPaused.current) {
        // Set here as a property, not only as an attribute: React does not
        // always serialise `muted`, and an unmuted video may not autoplay.
        v.muted = true;
        v.preload = "auto";
        void v.play().catch(() => setLive(false));
      } else {
        v.pause();
      }
    };
    sync.current = update;

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true;
            update();
          });
    observer?.observe(v);
    shown.addEventListener("change", update);
    calm.addEventListener("change", update);
    update();

    return () => {
      observer?.disconnect();
      shown.removeEventListener("change", update);
      calm.removeEventListener("change", update);
    };
  }, []);

  const toggle = () => {
    userPaused.current = !userPaused.current;
    setPaused(userPaused.current);
    sync.current();
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 hidden portrait:block panel:z-10 panel:mx-auto panel:flex panel:max-w-7xl panel:items-center panel:justify-end panel:px-8 panel:pt-[var(--header-h)]">
        <div className="h-full w-full panel:aspect-[9/16] panel:h-[min(66vh,720px)] panel:w-auto panel:overflow-hidden panel:rounded-t-full panel:border panel:border-gold/60 panel:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)] panel:outline panel:outline-1 panel:outline-offset-[10px] panel:outline-gold/25">
          <video
            ref={video}
            poster={heroMotionPoster}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            aria-hidden="true"
            className="h-full w-full object-cover"
          >
            <source src={heroMotion} type="video/mp4" />
          </video>
        </div>
      </div>

      {live ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? "Play the background film" : "Pause the background film"}
          className="absolute right-4 top-[calc(var(--header-h)+1rem)] z-20 grid h-10 w-10 place-items-center rounded-full border border-ivory/30 bg-primary-deep/40 text-ivory backdrop-blur-sm transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:right-6 lg:right-8"
        >
          {paused ? (
            <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      ) : null}
    </>
  );
}
