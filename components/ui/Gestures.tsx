"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host stands in the bottom-right corner (computers only) between the first screen and the closing scene.
 * He does not walk: each time the page comes to rest he turns in 3D and makes the next hand gesture,
 * presenting the content or pointing down with both fingers under a bouncing arrow.
 */
const POSES = [
  { src: "/intro/pose-5.webp", w: 222, h: 495, act: "present" },
  { src: "/intro/pose-4.webp", w: 173, h: 490, act: "point" },
] as const;
const STOP_MS = 380;

export default function Gestures() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (phase !== "entered") return;
    const b = box.current;
    const bd = body.current;
    if (!b || !bd) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");

    let pose = 0;
    let busy = false;
    let settled = true;
    let lastY = window.scrollY;
    let movedAt = 0;
    let raf = 0;

    const show = (k: number) => {
      pose = k;
      imgs.current.forEach((img, i) => img?.classList.toggle("is-on", i === k));
      b.dataset.act = POSES[k].act;
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
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 0.5) { movedAt = now; settled = false; }
      lastY = y;
      if (!settled && now - movedAt > STOP_MS && !busy) {
        settled = true;
        if (on && !reducedMotion) turnTo((pose + 1) % POSES.length);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="gest" data-act="present">
      <span className="gest__floor" />
      <div ref={body} className="gest__body">
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
