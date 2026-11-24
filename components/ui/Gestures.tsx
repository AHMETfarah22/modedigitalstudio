"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host walks down the page in his own column, left of the cards (wide screens only, between the first
 * screen and the closing scene), so he never covers the content. His 3D film (public/intro/host-talk.webm:
 * background cut away, every frame scaled to the same size, no sound) plays while the page scrolls:
 * he walks and shows the cards on his right with his hands. When the page stops he stops too.
 * He sits behind the route and the header, shaded like the page, so he is part of it, not stuck on top.
 * Safari cannot show a see-through WebM, so there he stands as a still.
 */
const FROM = 0.05; // the film runs from here to END, then starts again behind a short fade
const END = 8.25;
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
    let lastY = window.scrollY;
    let movedAt = -1e9;
    let wrapping = false;
    let raf = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const show = wide.matches && (!hero || hero.getBoundingClientRect().bottom < vh * 0.55) && (!closing || closing.getBoundingClientRect().top > vh * 0.8);
      if (show !== on) {
        on = show;
        b.classList.toggle("is-on", on);
      }
      const y = window.scrollY;
      if (Math.abs(y - lastY) > SLOW_PX) movedAt = now;
      lastY = y;
      if (!v) return;
      const moving = on && now - movedAt < STOP_MS;
      if (moving && v.paused && !wrapping) v.play().catch(() => {});
      if (!moving && !v.paused) v.pause();
      if (!wrapping && v.currentTime >= END) {
        wrapping = true;
        b.classList.add("is-swap");
        window.setTimeout(() => {
          v.currentTime = FROM;
          window.setTimeout(() => { b.classList.remove("is-swap"); wrapping = false; }, 80);
        }, 110);
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
