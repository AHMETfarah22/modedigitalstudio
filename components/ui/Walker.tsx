"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host walks down the page with the visitor, behind the text and cards.
 * He takes over once the first screen has scrolled away and hands over to the closing scene,
 * where he appears again holding the studio mark.
 *
 * The sprite (public/intro/walker.webp) is 25 frames cut from his walk-in film:
 * frames 0-7 are a side-on walk, 8-24 turn him to face the visitor and present.
 * While the page moves he walks (one frame per few pixels scrolled, backwards when scrolling up);
 * when it stops he turns to the visitor; when it moves again he turns back and walks on.
 */
const FRAMES = 25;
const WALK = 8;
const STAND = FRAMES - 1;
const PX_PER_FRAME = 26;

export default function Walker() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "entered") return;
    const b = box.current;
    const f = fig.current;
    if (!b || !f) return;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");

    let frame = STAND;
    let shown = -1;
    let walked = 0;
    let lastY = window.scrollY;
    let movedAt = 0;
    let tick = 0;
    let raf = 0;

    const draw = (n: number) => {
      if (n === shown) return;
      shown = n;
      f.style.backgroundPosition = `${(n / (FRAMES - 1)) * 100}% 0`;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const heroGone = !hero || hero.getBoundingClientRect().bottom < vh * 0.55;
      const beforeEnd = !closing || closing.getBoundingClientRect().top > vh * 0.8;
      b.classList.toggle("is-on", heroGone && beforeEnd);

      if (reducedMotion) { draw(STAND); return; }

      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) movedAt = now;
      const walking = now - movedAt < 220;
      const step = now - tick > 42; // turning runs at about 24 frames a second
      if (walking) {
        if (frame >= WALK) {
          // turn back to the side before walking on
          if (step) { frame = Math.max(WALK - 1, frame - 2); tick = now; }
          if (frame === WALK - 1) frame = 0;
        } else {
          walked += dy / PX_PER_FRAME;
          frame = ((Math.floor(walked) % WALK) + WALK) % WALK;
        }
      } else if (frame < STAND && step) {
        // stopped: turn to the visitor and present
        frame = frame < WALK ? WALK : frame + 1;
        tick = now;
      }
      draw(frame);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="walker">
      <span className="walker__floor" />
      <div ref={fig} className="walker__fig" style={{ backgroundImage: `url(${asset("/intro/walker.webp")})` }} />
    </div>
  );
}
