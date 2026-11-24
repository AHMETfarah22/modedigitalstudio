"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host in the bottom-right corner (computers only), in front of the page, between the first screen
 * and the closing scene. While the page scrolls he walks (frames 0-7 of public/intro/walker.webp, cut from
 * his walk-in film, mirrored so he faces the content; backwards when scrolling up). Each time it comes to
 * rest he turns in 3D and makes the next hand gesture: presenting the content, or pointing down with both
 * fingers under a bouncing arrow. When it moves again he turns back and walks on.
 */
const POSES = [
  { src: "/intro/pose-5.webp", w: 222, h: 495, act: "present" },
  { src: "/intro/pose-4.webp", w: 173, h: 490, act: "point" },
] as const;
const STOP_MS = 380;
const FRAMES = 25;
const WALK = 8;
const PX_PER_FRAME = 26;

export default function Gestures() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (phase !== "entered") return;
    const b = box.current;
    const bd = body.current;
    const f = fig.current;
    if (!b || !bd || !f) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");

    let pose = 0; // gesture showing, or -1 while walking
    let next = 1;
    let busy = false;
    let lastY = window.scrollY;
    let movedAt = 0;
    let walked = 0;
    let shown = -1;
    let raf = 0;

    const draw = (n: number) => {
      if (n === shown) return;
      shown = n;
      f.style.backgroundPosition = `${(n / (FRAMES - 1)) * 100}% 0`;
    };
    const show = (k: number) => {
      pose = k;
      f.classList.toggle("is-on", k < 0);
      imgs.current.forEach((img, i) => img?.classList.toggle("is-on", i === k));
      b.dataset.act = k < 0 ? "walk" : POSES[k].act;
    };
    // swing edge-on, change gesture, swing back
    const turnTo = (k: number) => {
      busy = true;
      bd.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(88deg)" }], { duration: 170, easing: "cubic-bezier(0.5, 0, 0.9, 0.5)", fill: "forwards" })
        .finished.then(() => {
          show(k);
          return bd.animate([{ transform: "rotateY(-88deg)" }, { transform: "rotateY(0deg)" }], { duration: 320, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)", fill: "forwards" }).finished;
        })
        .then(() => { busy = false; })
        .catch(() => { busy = false; });
    };

    show(0);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const on = (!hero || hero.getBoundingClientRect().bottom < vh * 0.55) && (!closing || closing.getBoundingClientRect().top > vh * 0.8);
      b.classList.toggle("is-on", on);
      if (reducedMotion) return;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) movedAt = now;
      const moving = now - movedAt < STOP_MS;
      if (busy) return;
      if (!on) { if (pose < 0) show(0); return; }
      if (moving && pose >= 0) turnTo(-1); // stop gesturing, turn side-on and walk
      else if (moving) {
        walked += dy / PX_PER_FRAME;
        draw(((Math.floor(walked) % WALK) + WALK) % WALK);
      } else if (pose < 0) {
        turnTo(next);
        next = (next + 1) % POSES.length;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="gest" data-act="present">
      <span className="gest__floor" />
      <div ref={body} className="gest__body">
        <div ref={fig} className="gest__walk" style={{ backgroundImage: `url(${asset("/intro/walker.webp")})` }} />
        {POSES.map((p, i) => (
          <img
            key={p.src}
            ref={(el) => { imgs.current[i] = el; }}
            src={asset(p.src)}
            alt=""
            width={p.w}
            height={p.h}
            draggable={false}
            className={`gest__pose gest__pose--${p.act}`}
          />
        ))}
      </div>
    </div>
  );
}
