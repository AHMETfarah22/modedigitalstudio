"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * A ring that trails the pointer and a dot that sits on it.
 * Grows over links and buttons; shows a label over elements with data-cursor="Play" etc.
 * Only on fine pointers and without reduced motion.
 */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = ring.current;
    const d = dot.current;
    if (!fine || reduce || !r || !d) return;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3.out" });
    const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3.out" });
    const dx = gsap.quickTo(d, "x", { duration: 0.08 });
    const dy = gsap.quickTo(d, "y", { duration: 0.08 });
    let shown = false;

    const move = (e: PointerEvent) => {
      if (!shown) {
        gsap.to([r, d], { autoAlpha: 1, duration: 0.3 });
        shown = true;
      }
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
      const t = (e.target as Element | null)?.closest?.("a, button, [data-cursor], input, textarea, select");
      const text = t?.getAttribute("data-cursor") ?? "";
      const isField = t?.matches("input, textarea, select");
      r.dataset.state = !t || isField ? "" : text ? "label" : "link";
      if (label.current) label.current.textContent = text;
    };
    const leave = () => {
      gsap.to([r, d], { autoAlpha: 0, duration: 0.2 });
      shown = false;
    };
    const down = () => gsap.to(r, { scale: 0.85, duration: 0.15 });
    const up = () => gsap.to(r, { scale: 1, duration: 0.3, ease: "back.out(3)" });

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      html.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div aria-hidden className="cursor-layer pointer-events-none fixed inset-0 z-[100]">
      <div ref={ring} data-state="" className="cursor-ring invisible">
        <span ref={label} />
      </div>
      <div ref={dot} className="cursor-dot invisible" />
    </div>
  );
}
