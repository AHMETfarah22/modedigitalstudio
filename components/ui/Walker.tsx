"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";

/**
 * The host walks down the page with the visitor, in the bottom-right corner, behind the text and cards.
 * He takes over once the first screen has scrolled away and hands over to the closing scene,
 * where he appears again holding the studio mark.
 *
 * While the page moves he walks (frames 0-7 of public/intro/walker.webp, cut from his walk-in film,
 * mirrored so he faces the content; backwards when scrolling up). When it stops he turns in 3D
 * and makes a hand gesture: presenting the content, or pointing down with both fingers.
 * When it moves again he turns back and walks on.
 */
const FRAMES = 25;
const WALK = 8;
const PX_PER_FRAME = 26;
const STOP_MS = 380;

/** Gesture poses. `bx` is where his body's centre sits across the image (0-1), so he turns on the spot. */
const POSES = [
  { src: "/intro/pose-5.webp", w: 222, h: 495, bx: 0.68, act: "present" },
  { src: "/intro/pose-4.webp", w: 173, h: 490, bx: 0.5, act: "point" },
] as const;

export default function Walker() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLDivElement>(null);
  const poses = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (phase !== "entered") return;
    const b = box.current;
    const bd = body.current;
    const f = fig.current;
    if (!b || !bd || !f) return;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");

    let state: "walk" | "turning" | "pose" = "walk";
    let pose = -1;
    let next = 0;
    let frame = 0;
    let shown = -1;
    let walked = 0;
    let lastY = window.scrollY;
    let movedAt = performance.now();
    let raf = 0;

    const draw = (n: number) => {
      if (n === shown) return;
      shown = n;
      f.style.backgroundPosition = `${(n / (FRAMES - 1)) * 100}% 0`;
    };
    const showPose = (k: number) => {
      pose = k;
      f.style.opacity = k < 0 ? "1" : "0";
      poses.current.forEach((img, i) => img?.classList.toggle("is-on", i === k));
      b.dataset.act = k < 0 ? "walk" : POSES[k].act;
    };

    // a 3D turn: swing edge-on, swap what he is doing, swing back
    const turn = (to: number) => {
      state = "turning";
      const half = { duration: 170, easing: "cubic-bezier(0.5, 0, 0.9, 0.5)", fill: "forwards" as const };
      bd.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(88deg)" }], half).finished.then(() => {
        showPose(to);
        return bd.animate([{ transform: "rotateY(-88deg)" }, { transform: "rotateY(0deg)" }], {
          duration: 300, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)", fill: "forwards",
        }).finished;
      }).then(() => { state = to < 0 ? "walk" : "pose"; }).catch(() => {});
    };

    if (reducedMotion) showPose(0);
    else showPose(-1);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const heroGone = !hero || hero.getBoundingClientRect().bottom < vh * 0.55;
      const beforeEnd = !closing || closing.getBoundingClientRect().top > vh * 0.8;
      b.classList.toggle("is-on", heroGone && beforeEnd);
      if (reducedMotion) return;

      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) movedAt = now;
      const moving = now - movedAt < STOP_MS;

      if (state === "walk") {
        if (moving) {
          walked += dy / PX_PER_FRAME;
          frame = ((Math.floor(walked) % WALK) + WALK) % WALK;
          draw(frame);
        } else if (b.classList.contains("is-on")) {
          turn(next);
          next = (next + 1) % POSES.length;
        }
      } else if (state === "pose" && moving) {
        turn(-1);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="walker" data-act="walk">
      <span className="walker__floor" />
      <div ref={body} className="walker__body">
        <div ref={fig} className="walker__fig" style={{ backgroundImage: `url(${asset("/intro/walker.webp")})` }} />
        {POSES.map((p, i) => (
          <img
            key={p.src}
            ref={(el) => { poses.current[i] = el; }}
            src={asset(p.src)}
            alt=""
            loading="lazy"
            draggable={false}
            className={`walker__pose walker__pose--${p.act}`}
            style={{ "--pw": `${((p.w / p.h) * 480) / 307}`, "--bx": p.bx } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
