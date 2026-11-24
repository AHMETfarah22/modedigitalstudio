"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { hasWebGL, useExperience } from "@/lib/experience";
import type { WalkerDrive } from "@/components/three/Walker3D";

const Walker3D = dynamic(() => import("@/components/three/Walker3D"), { ssr: false });

/**
 * The host walks down the page in his own column, left of the cards (wide screens only, between the first
 * screen and the closing scene). He is a 3D figure (components/three/Walker3D): he walks while the page
 * scrolls and points at the cards one at a time, the card nearest the middle of the screen. That card
 * lights up while he shows it.
 */
const CARDS = "#work ul > li, #motion ul > li, #documents .mt-14, #about ul > li";
const STOP_MS = 160;

export default function Gestures() {
  const { phase, reducedMotion } = useExperience();
  const box = useRef<HTMLDivElement>(null);
  const drive = useRef<WalkerDrive>({ speed: 0, target: null, still: true });
  const [gl, setGl] = useState(false);
  const [on, setOn] = useState(false);
  const [seen, setSeen] = useState(false); // keep the 3D scene once made; it only pauses while hidden

  useEffect(() => {
    if (phase !== "entered") return;
    const wide = window.matchMedia("(min-width: 1280px)");
    if (!hasWebGL()) return;
    setGl(true);
    const b = box.current;
    if (!b) return;
    const hero = document.getElementById("top");
    const closing = document.querySelector<HTMLElement>("[data-closing]");
    const cards = Array.from(document.querySelectorAll<HTMLElement>(CARDS));

    let shownOn = false;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let movedAt = -1e9;
    let speed = 0;
    let lit: HTMLElement | null = null;
    let raf = 0;

    const light = (el: HTMLElement | null) => {
      if (el === lit) return;
      lit?.classList.remove("is-shown");
      lit = el;
      lit?.classList.add("is-shown");
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const vh = window.innerHeight;
      const show = wide.matches && (!hero || hero.getBoundingClientRect().bottom < vh * 0.55) && (!closing || closing.getBoundingClientRect().top > vh * 0.8);
      if (show !== shownOn) {
        shownOn = show;
        b.classList.toggle("is-on", show);
        setOn(show);
        if (show) setSeen(true);
        if (!show) light(null);
      }
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT);
      const inst = (Math.abs(y - lastY) / dt) * 1000;
      if (Math.abs(y - lastY) > 1.5) movedAt = now;
      speed += (inst - speed) * 0.2;
      lastY = y;
      lastT = now;
      const d = drive.current;
      d.still = reducedMotion || now - movedAt > STOP_MS;
      d.speed = speed;
      if (!show) { d.target = null; return; }

      // the card nearest the middle of the screen, if one is on it
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      const mid = vh * 0.5;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (r.bottom < vh * 0.12 || r.top > vh * 0.88) continue;
        const dd = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dd < bestD) { bestD = dd; best = c; }
      }
      light(best);
      if (best) {
        const r = best.getBoundingClientRect();
        d.target = { x: r.left + 24, y: Math.min(Math.max((r.top + r.bottom) / 2, r.top + 40), vh * 0.9) };
      } else d.target = null;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [phase, reducedMotion]);

  return (
    <div ref={box} aria-hidden className="gest">
      {gl && seen && <Walker3D drive={drive} active={on} />}
    </div>
  );
}
