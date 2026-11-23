"use client";

import { useRef } from "react";

/**
 * 3D tilt with a light glare that follows the pointer. CSS variables only, no re-renders.
 * Mouse only; does nothing under reduced motion.
 */
export default function Tilt({
  children,
  className = "",
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (e.pointerType !== "mouse" || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      el.dataset.active = "1";
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.dataset.active = "";
  };

  return (
    <div className={`[perspective:1100px] ${className}`}>
      <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className="tilt group/tilt relative h-full">
        {children}
        <div aria-hidden className="tilt-glare" />
      </div>
    </div>
  );
}
