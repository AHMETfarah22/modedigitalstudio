"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";
import ModeLogo from "@/components/ui/ModeLogo";

/**
 * The studio host walks the visitor through the page: he steps in at the corner after the hero,
 * presents each section with a speech bubble, leans toward the pointer, and steps out when the
 * closing scene (where he appears full size) comes into view. Clicking him goes to the contact scene.
 */

const LINES: { anchor: string; say: string }[] = [
  { anchor: "#work", say: "These sites are live. Open one and look around." },
  { anchor: "#concepts-title", say: "Concept sites for local shops. Try one." },
  { anchor: "#motion", say: "Our games, VR and films. Tap a card to watch." },
  { anchor: "#documents", say: "Leaf through the Mode Academy brochure." },
  { anchor: "#about", say: "This is what the studio makes." },
];

export default function Guide() {
  const { phase, reducedMotion } = useExperience();
  const [line, setLine] = useState(-1);
  const [show, setShow] = useState(false);
  const [hop, setHop] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Which section is in the middle of the screen, and is the closing scene in view
  useEffect(() => {
    if (phase !== "entered") return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let n = -1;
      LINES.forEach((l, i) => {
        const el = document.querySelector(l.anchor);
        if (el && el.getBoundingClientRect().top < mid) n = i;
      });
      const foot = document.querySelector("#contact");
      const footIn = foot ? foot.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
      setShow(n >= 0 && !footIn);
      setLine((prev) => (prev === n ? prev : n));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [phase]);

  // A small hop each time he starts a new line
  // and, after a few seconds, he steps back so he never sits on the content for long
  useEffect(() => {
    if (line < 0) return;
    setHop((h) => h + 1);
    setQuiet(false);
    const t = window.setTimeout(() => setQuiet(true), 4500);
    return () => window.clearTimeout(t);
  }, [line]);

  // Lean toward the pointer, in 3D
  useEffect(() => {
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;
    const el = tiltRef.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      el.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 8}deg)`;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reducedMotion, phase]);

  if (phase !== "entered") return null;
  const say = line >= 0 ? LINES[line].say : "";

  return (
    <a
      href="#contact"
      aria-label="Talk to the studio"
      className={`guide ${show ? "is-on" : ""} ${quiet ? "is-quiet" : ""}`}
      onClick={(e) => {
        const lenis = window.__lenis;
        if (lenis) { e.preventDefault(); lenis.scrollTo("#contact"); }
      }}
    >
      <span key={`b${line}`} className="guide__bubble" aria-live="polite">{say}</span>
      <span className="guide__stage">
        <span ref={tiltRef} className="guide__tilt">
          <span key={`h${hop}`} className="guide__hop">
            <span className="guide__breathe">
              <img src={asset("/intro/host.webp")} alt="" width={760} height={1065} draggable={false} />
            </span>
            <span className="guide__orb" aria-hidden>
              <span className="guide__orb-ring" />
              <span className="guide__orb-core"><ModeLogo className="h-[52%] w-auto text-ink" /></span>
            </span>
          </span>
        </span>
        <span className="guide__floor" aria-hidden />
      </span>
    </a>
  );
}
