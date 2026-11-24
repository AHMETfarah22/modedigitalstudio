"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host in the bottom-right corner (computers only), in front of the page, between the first screen
 * and the closing scene. While the page scrolls he walks toward you pointing down with both hands
 * (public/intro/walk-point.webp, stepping in CSS). Each time it comes to rest he turns in 3D and makes
 * the next hand gesture: pointing to the side, or presenting the content. When it moves again he turns
 * back and walks on. On a long scroll he stops for a gesture every couple of seconds anyway.
 */
const WALK_POSE = { src: "/intro/walk-point.webp", w: 361, h: 942 };
const POSES = [
  { src: "/intro/pose-side.webp", w: 158, h: 509, act: "side" },
  { src: "/intro/pose-5.webp", w: 222, h: 495, act: "present" },
] as const;
const STOP_MS = 160; // smooth scrolling glides on after the wheel stops: count a slow glide as stopped
const SLOW_PX = 2.5;
const WALK_MS = 2200; // longest walk before he stops to gesture anyway
const HOLD_MS = 1900; // how long that gesture holds while the page keeps scrolling

export default function Gestures() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLImageElement>(null);
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
    let walkFrom = 0;
    let holdUntil = 0;
    let raf = 0;

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
      if (Math.abs(dy) > SLOW_PX) movedAt = now;
      const moving = now - movedAt < STOP_MS;
      if (busy) return;
      if (!on) { if (pose < 0) show(0); return; }
      const gesture = () => {
        turnTo(next);
        next = (next + 1) % POSES.length;
      };
      if (pose >= 0) {
        // gesturing: walk on once the page moves again (after a forced pause has had its moment)
        if (moving && now > holdUntil) { turnTo(-1); walkFrom = now + 490; }
      } else if (moving) {
        if (now - walkFrom > WALK_MS) { holdUntil = now + HOLD_MS; gesture(); }
      } else {
        gesture();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="gest" data-act="side">
      <span className="gest__floor" />
      <div ref={body} className="gest__body">
        <img ref={fig} src={asset(WALK_POSE.src)} alt="" width={WALK_POSE.w} height={WALK_POSE.h} draggable={false} className="gest__pose gest__pose--walk" />
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
