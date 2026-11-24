"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host walks down the page in his own column, left of the cards (wide screens only, between the first
 * screen and the closing scene), so he never covers the content. His 3D film (public/intro/host-talk.webm:
 * background cut away, every frame scaled to the same size, no sound) is played in parts:
 * while the page scrolls he walks; each time it comes to rest he plays the next hand gesture toward the
 * cards on his right, then holds it until the page moves again.
 * Safari cannot show a see-through WebM, so there he stands as a still.
 */
const WALKS: [number, number][] = [[0.05, 1.2], [3.2, 4.3]];
const GESTURES: [number, number][] = [[4.3, 6.6], [1.2, 3.2], [6.6, 8.25]];
const STOP_MS = 180; // smooth scrolling glides on after the wheel stops: count a slow glide as stopped
const SLOW_PX = 2;
const W = 380;
const H = 486;

export default function Gestures() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  // null until we know whether this browser can show the see-through film
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

    let on = false;
    let mode: "walk" | "gesture" | "hold" = "hold";
    let seg: [number, number] = WALKS[0];
    let walkN = 0;
    let gestN = 0;
    let lastY = window.scrollY;
    let movedAt = -1e9;
    let gestureAt = 0;
    let raf = 0;

    // jump to a part of the film behind a very short fade, so the cut does not show
    const start = (m: typeof mode, s: [number, number]) => {
      if (!v) return;
      mode = m;
      seg = s;
      b.classList.add("is-swap");
      window.setTimeout(() => {
        v.currentTime = s[0];
        v.play().catch(() => {});
        window.setTimeout(() => b.classList.remove("is-swap"), 60);
      }, 110);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const show = wide.matches && (!hero || hero.getBoundingClientRect().bottom < vh * 0.55) && (!closing || closing.getBoundingClientRect().top > vh * 0.8);
      if (show !== on) {
        on = show;
        b.classList.toggle("is-on", on);
        if (!on && v) { v.pause(); mode = "hold"; }
      }
      const y = window.scrollY;
      if (Math.abs(y - lastY) > SLOW_PX) movedAt = now;
      lastY = y;
      if (!on || !v) return;
      const moving = now - movedAt < STOP_MS;

      if (moving) {
        // walk on; a gesture that has only just begun is allowed to finish its first beat
        if (mode !== "walk" && !(mode === "gesture" && now - gestureAt < 700)) {
          start("walk", WALKS[walkN++ % WALKS.length]);
        } else if (mode === "walk" && v.currentTime >= seg[1]) {
          start("walk", WALKS[walkN++ % WALKS.length]);
        }
      } else if (mode === "walk") {
        gestureAt = now;
        start("gesture", GESTURES[gestN++ % GESTURES.length]);
      }
      if (mode === "gesture" && v.currentTime >= seg[1]) {
        v.pause();
        mode = "hold";
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      v?.pause();
    };
  }, [phase, still]);

  return (
    <div ref={box} aria-hidden className="gest">
      {still !== false ? (
        <img src={asset("/intro/host-talk-end.webp")} alt="" width={W} height={H} draggable={false} className="gest__film" />
      ) : (
        <video
          ref={film}
          className="gest__film"
          src={asset("/intro/host-talk.webm")}
          poster={asset("/intro/host-talk-end.webp")}
          muted
          playsInline
          preload="auto"
          width={W}
          height={H}
        />
      )}
    </div>
  );
}
