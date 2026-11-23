"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { useLang } from "@/lib/i18n";

/**
 * A studio backdrop in the first screen, like a lookbook: the host stands in front, his other poses
 * wait in a row behind him, and every few seconds the next pose steps forward. The photos keep their
 * own white studio floor and are multiplied onto the light backdrop, so he stands in the scene with
 * his real floor shadow instead of looking cut out. Arrows (or the dots) pick a pose.
 */

const POSES = [
  { src: "/intro/studio-4.webp", w: 180, ax: 0.486 }, // points down: "scroll on"
  { src: "/intro/studio-1.webp", w: 250, ax: 0.43 }, // presents
  { src: "/intro/studio-2.webp", w: 183, ax: 0.44 }, // raises a finger
  { src: "/intro/studio-3.webp", w: 161, ax: 0.476 }, // points
  { src: "/intro/studio-5.webp", w: 227, ax: 0.57 }, // presents with both hands
];
const H = 572;

// front, then the row behind (further back = smaller and slightly higher)
const SLOTS = [
  { x: 32, h: 94, b: 2, z: 10 },
  { x: 61, h: 50, b: 14, z: 5 },
  { x: 71, h: 46, b: 15, z: 4 },
  { x: 81, h: 42, b: 16, z: 3 },
  { x: 90, h: 38, b: 17, z: 2 },
];

export default function HeroLineup() {
  const { t } = useLang();
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const n = POSES.length;

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFront((f) => (f + 1) % n), 3200);
    return () => window.clearInterval(id);
  }, [paused, n]);

  // the backdrop turns a little toward the pointer
  useEffect(() => {
    const el = panel.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      el.style.setProperty("--ry", `${x * 10}deg`);
      el.style.setProperty("--rx", `${-y * 5}deg`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const go = (d: number) => {
    setPaused(true);
    setFront((f) => (f + d + n) % n);
  };

  return (
    <div className="lineup" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div ref={panel} className="lineup__panel">
        <span className="lineup__spot" aria-hidden />
        <span className="lineup__floor" aria-hidden />
        {POSES.map((p, i) => {
          const s = SLOTS[(i - front + n) % n];
          return (
            <img
              key={p.src}
              src={asset(p.src)}
              alt=""
              width={p.w}
              height={H}
              draggable={false}
              className={`lineup__fig ${s === SLOTS[0] ? "is-front" : ""}`}
              style={{ left: `${s.x}%`, height: `${s.h}%`, bottom: `${s.b}%`, zIndex: s.z, transform: `translateX(${-p.ax * 100}%)` }}
            />
          );
        })}
        <p className="lineup__brand" aria-hidden>
          MODE ACADEMY
        </p>
        <div className="lineup__nav">
          <button type="button" onClick={() => go(-1)} aria-label={t("Previous pose", "Önceki poz")}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <span className="lineup__count" aria-live="polite">
            {String(front + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => go(1)} aria-label={t("Next pose", "Sonraki poz")}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <span className="lineup__bubble" aria-hidden>
        {t("Scroll down to see our work", "Aşağı kaydırın, işlerimizi görün")}
      </span>
    </div>
  );
}
