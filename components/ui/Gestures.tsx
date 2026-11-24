"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host in the bottom-right corner (computers only), in front of the page, between the first screen
 * and the closing scene. Now and then he walks toward you and talks with his hands: his own 3D film
 * (public/intro/host-talk.webm, background cut away, no sound). Between plays he holds his last pose.
 * Safari cannot show a see-through WebM, so there he stands in that last pose as a still.
 */
const EVERY_MS = 16000; // pause between plays
const W = 392;
const H = 680;

export default function Gestures() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  // null until we know whether this browser can show the see-through film
  const [still, setStill] = useState<boolean | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
    setStill(reducedMotion || safari);
  }, [reducedMotion]);

  useEffect(() => {
    if (phase !== "entered" || still === null) return;
    const b = box.current;
    if (!b) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const canFilm = !still;
    const v = film.current;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");

    let on = false;
    let next = 0; // when the next play may start
    let playing = false;
    let raf = 0;

    const play = () => {
      if (!v) return;
      playing = true;
      b.classList.add("is-swap");
      window.setTimeout(() => {
        v.currentTime = 0;
        v.play().then(() => b.classList.remove("is-swap")).catch(() => { playing = false; b.classList.remove("is-swap"); });
      }, 250);
    };
    const ended = () => {
      playing = false;
      next = performance.now() + EVERY_MS;
    };
    v?.addEventListener("ended", ended);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const show = (!hero || hero.getBoundingClientRect().bottom < vh * 0.55) && (!closing || closing.getBoundingClientRect().top > vh * 0.8);
      if (show !== on) {
        on = show;
        b.classList.toggle("is-on", on);
        if (!on && v && playing) { v.pause(); playing = false; next = 0; }
      }
      if (on && canFilm && !playing && now >= next) play();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      v?.removeEventListener("ended", ended);
    };
  }, [phase, still]);

  return (
    <div ref={box} aria-hidden className="gest">
      <span className="gest__floor" />
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
