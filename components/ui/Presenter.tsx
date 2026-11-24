"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host from the first screen comes down the page with the visitor (wide screens only), in his own
 * column right of the content, so he never covers a card. While the page scrolls he walks; each time a
 * new card reaches the middle of the screen he presents it with both hands (the end of his walk-in film,
 * background cut away, no sound), and that card lights up.
 * Safari cannot show a see-through WebM, so there he holds the presenting pose as a still.
 */
const CARDS = "#work ul > li, #motion ul > li, #documents .mt-14, #about ul > li";
const STOP_MS = 160;

export default function Presenter() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState<boolean | null>(null);

  useEffect(() => {
    const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    setStill(reducedMotion || safari);
  }, [reducedMotion]);

  useEffect(() => {
    if (phase !== "entered" || still === null) return;
    const b = box.current;
    if (!b) return;
    const wide = window.matchMedia("(min-width: 1280px)");
    const v = still ? null : film.current;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");
    const cards = Array.from(document.querySelectorAll<HTMLElement>(CARDS));

    let on = false;
    let lit: HTMLElement | null = null;
    let lastY = window.scrollY;
    let movedAt = -1e9;
    let raf = 0;

    const present = () => {
      if (!v) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    };
    const light = (el: HTMLElement | null) => {
      if (el === lit) return;
      lit?.classList.remove("is-shown");
      lit = el;
      if (lit) { lit.classList.add("is-shown"); present(); }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const show = wide.matches && (!hero || hero.getBoundingClientRect().bottom < vh * 0.7) && (!closing || closing.getBoundingClientRect().top > vh * 0.8);
      if (show !== on) {
        on = show;
        b.classList.toggle("is-on", on);
        if (!on) light(null);
      }
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 1.5) movedAt = now;
      lastY = y;
      b.classList.toggle("is-walking", on && !reducedMotion && now - movedAt < STOP_MS);
      if (!on) return;

      // the card nearest the middle of the screen
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      const mid = vh * 0.5;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (r.bottom < vh * 0.15 || r.top > vh * 0.85) continue;
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { bestD = d; best = c; }
      }
      light(best);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [phase, still, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="presenter">
      <div className="presenter__body">
        {still !== false ? (
          <img src={asset("/intro/host-present.webp")} alt="" width={445} height={600} draggable={false} className="presenter__film" />
        ) : (
          <video
            ref={film}
            className="presenter__film"
            src={asset("/intro/host-present.webm")}
            poster={asset("/intro/host-present.webp")}
            muted
            playsInline
            preload="auto"
            width={445}
            height={600}
          />
        )}
      </div>
    </div>
  );
}
