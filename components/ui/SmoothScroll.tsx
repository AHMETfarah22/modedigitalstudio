"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useExperience } from "@/lib/experience";

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scrolling, synced with GSAP ScrollTrigger. Off under reduced motion. */
export default function SmoothScroll() {
  const { phase, reducedMotion } = useExperience();

  useEffect(() => {
    if (reducedMotion || phase !== "entered") return;
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -72 } });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, [phase, reducedMotion]);

  return null;
}

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}
