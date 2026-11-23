"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { hasWebGL, useExperience } from "@/lib/experience";
import type { PortalProgress } from "@/components/three/PortalScene";
import Magnetic from "@/components/ui/Magnetic";
import Presenter from "./Presenter";
import { STUDIO } from "@/data/studio";

gsap.registerPlugin(SplitText, useGSAP);

const PortalScene = dynamic(() => import("@/components/three/PortalScene"), { ssr: false });

/**
 * Opening sequence:
 *  1. Porcelain stage. A small glowing gyroscope appears in the top-left corner and travels to the centre.
 *  2. "WELCOME TO" and "MODE DIGITAL STUDIO" reveal; the presenter steps in from the side.
 *  3. The room goes dark, the mark becomes a 3D portal, it opens and the camera flies through.
 * "Enter studio" (or Esc) skips at any point. Plays once per tab.
 */
export default function Intro() {
  const { phase, enter, reducedMotion, lite } = useExperience();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef<PortalProgress>({ p: 0 }).current;
  const [gl, setGl] = useState(false);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (phase === "intro") setGl(!reducedMotion && hasWebGL());
  }, [phase, reducedMotion]);

  const close = useCallback(
    (fast = false) => {
      if (closing || !root.current) return;
      setClosing(true);
      tl.current?.kill();
      enter();
      gsap.to(root.current, {
        autoAlpha: 0,
        duration: fast ? 0.45 : 0.8,
        ease: "power2.out",
        onComplete: () => setDone(true),
      });
    },
    [closing, enter],
  );

  useEffect(() => {
    if (phase !== "intro") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, close]);

  useGSAP(
    () => {
      if (phase !== "intro") return;
      const q = gsap.utils.selector(root);
      const welcome = new SplitText(q("[data-welcome]"), { type: "chars", mask: "chars" });
      const title = new SplitText(q("[data-title]"), { type: "lines,chars", mask: "lines" });

      const t = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.current = t;
      // Pieces stay hidden by CSS until the timeline owns them, so no finished frame flashes first.
      root.current?.classList.add("is-playing");
      // Dev only: lets the intro be scrubbed from the console (window.__introTl.seek(4)).
      if (process.env.NODE_ENV !== "production") (window as unknown as { __introTl?: gsap.core.Timeline }).__introTl = t;

      if (reducedMotion) {
        t.set([q("[data-orb]"), q("[data-presenter]"), q("[data-line]")], { autoAlpha: 1 })
          .from(q("[data-stage]"), { autoAlpha: 0, duration: 0.6 })
          .to({}, { duration: 2.4 })
          .add(() => close());
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      t.set(q("[data-orb]"), { x: -vw * 0.42, y: -vh * 0.38, scale: 0.45, autoAlpha: 0 })
        .to(q("[data-orb]"), { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0.2)
        .to(q("[data-orb]"), { x: 0, y: 0, scale: 1.15, duration: 1.5, ease: "power3.inOut" }, 0.45)
        .to(q("[data-orb-spin]"), { rotateY: 540, rotateX: 200, duration: 2.2, ease: "power2.inOut" }, 0.3)
        .to(q("[data-orb]"), { scale: 3.4, autoAlpha: 0.32, duration: 1.4, ease: "power2.inOut" }, 1.9)
        .from(welcome.chars, { yPercent: 115, duration: 0.9, stagger: 0.035 }, 1.75)
        .from(title.chars, { yPercent: 120, rotateX: -70, transformOrigin: "50% 100%", duration: 1.1, stagger: 0.028 }, 2.05)
        // a wave of light runs through the letters once
        .to(title.chars, { color: "#2bb8ff", duration: 0.25, stagger: 0.03, yoyo: true, repeat: 1, ease: "sine.inOut" }, 3.1)
        .from(q("[data-presenter]"), { xPercent: -28, autoAlpha: 0, duration: 1.4, ease: "power3.out" }, 2.3)
        .from(q("[data-floor]"), { scaleX: 0.2, autoAlpha: 0, duration: 1.2, ease: "power2.out" }, 2.5)
        .from(q("[data-arm]"), { rotate: 62, duration: 1.3, ease: "back.out(1.4)" }, 2.9)
        .from(q("[data-head]"), { rotate: -6, duration: 1.2, ease: "power2.out" }, 2.9)
        .to(q("[data-eyes]"), { scaleY: 0.1, duration: 0.09, yoyo: true, repeat: 1, repeatDelay: 0.02, ease: "none" }, 3.9)
        .to(q("[data-eyes]"), { scaleY: 0.1, duration: 0.09, yoyo: true, repeat: 1, repeatDelay: 0.02, ease: "none" }, 5.1)
        .from(q("[data-line]"), { y: 16, autoAlpha: 0, duration: 0.8 }, 3.2)
        .to(q("[data-bar]"), { scaleX: 1, duration: 5.6, ease: "none" }, 0)
        .addLabel("portal", 5.6);

      if (!gl) {
        // No WebGL: the mark expands past the screen instead of the 3D portal.
        t.to(q("[data-stage]"), { autoAlpha: 0, scale: 0.97, duration: 0.6, ease: "power2.in" }, "portal")
          .to(q("[data-night]"), { autoAlpha: 1, duration: 0.6 }, "portal")
          .to(q("[data-orb]"), { scale: 24, autoAlpha: 1, duration: 1.4, ease: "power3.in" }, "portal+=0.2")
          .add(() => close(), "portal+=1.5");
        return;
      }

      t.to(q("[data-stage]"), { autoAlpha: 0, scale: 0.96, filter: "blur(6px)", duration: 0.7, ease: "power2.in" }, "portal")
        .to(q("[data-night]"), { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, "portal")
        .to(q("[data-orb]"), { scale: 7, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, "portal")
        .to(q("[data-bar-wrap]"), { autoAlpha: 0, duration: 0.4 }, "portal")
        .to(q("[data-canvas]"), { autoAlpha: 1, duration: 0.6 }, "portal+=0.35")
        .to(progress, { p: 1, duration: 3.6, ease: "power1.inOut" }, "portal+=0.35")
        .to(q("[data-flash]"), { autoAlpha: 1, duration: 0.35, ease: "power2.in" }, "portal+=3.55")
        .add(() => close(), "portal+=3.9");

      return () => {
        welcome.revert();
        title.revert();
      };
    },
    { scope: root, dependencies: [phase, gl, reducedMotion], revertOnUpdate: true },
  );

  if (done) return null;
  if (phase === "entered" && !closing) return null;

  return (
    <div
      ref={root}
      data-intro-overlay
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Mode Digital Studio"
      className="fixed inset-0 z-[70] overflow-hidden bg-porcelain text-navy"
    >
      {/* Soft studio light on the porcelain wall */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_55%_at_62%_42%,#ffffff_0%,transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(31,92,220,0.10),transparent_70%)]" />

      {/* Glowing gyroscope: the studio mark in 3D */}
      <div data-orb aria-hidden className="invisible pointer-events-none absolute left-1/2 top-1/2 z-[1] -ml-14 -mt-14 size-28 [perspective:600px]">
        <div className="absolute inset-[-60%] rounded-full bg-[radial-gradient(closest-side,rgba(43,184,255,0.55),rgba(43,184,255,0.12)_55%,transparent)] blur-md" />
        <div data-orb-spin className="absolute inset-0 [transform-style:preserve-3d]">
          <span className="absolute inset-0 rounded-full border-[5px] border-ring shadow-[0_0_24px_rgba(43,184,255,0.8)]" />
          <span className="absolute inset-2 rounded-full border-2 border-signal/80 [transform:rotateY(70deg)]" />
          <span className="absolute inset-3 rounded-full border border-ring/60 [transform:rotateX(70deg)]" />
        </div>
        <span className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun shadow-[0_0_30px_8px_rgba(255,209,102,0.7)]" />
      </div>

      {/* Stage A: welcome */}
      <div data-stage className="relative z-[2] mx-auto grid h-full max-w-[1400px] grid-rows-[1fr_auto] items-center px-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-rows-1 md:px-12">
        <div className="relative order-2 flex h-full items-end justify-center self-end md:order-1">
          <div data-floor aria-hidden className="absolute bottom-[3%] left-1/2 h-8 w-[60%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(10,23,51,0.28),transparent)] blur-sm" />
          <div data-presenter className="relative">
            <Presenter className="h-[40vh] w-auto drop-shadow-[0_30px_40px_rgba(10,23,51,0.16)] md:h-[76vh]" />
          </div>
        </div>

        <div className="order-1 pt-[12vh] text-center md:order-2 md:pt-0 md:text-left">
          <p data-welcome className="font-display text-[clamp(0.95rem,1.6vw,1.35rem)] font-medium tracking-[0.42em] text-signal">
            WELCOME TO
          </p>
          <h1
            data-title
            className="mt-4 font-display text-[clamp(2.5rem,7.2vw,7.6rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-navy [perspective:800px]"
          >
            MODE
            <br />
            DIGITAL
            <br />
            STUDIO
          </h1>
          <p data-line className="mt-6 text-[clamp(1rem,1.4vw,1.2rem)] text-navy/70">
            The digital production studio of Mode Academy.
          </p>
        </div>
      </div>

      {/* Stage B: the portal */}
      <div data-night aria-hidden className="invisible absolute inset-0 z-[3] bg-night bg-[radial-gradient(60%_60%_at_50%_50%,#0a1733,#050b1e)]" />
      <div data-canvas aria-hidden className="invisible absolute inset-0 z-[4]">
        {gl && <PortalScene progress={progress} lite={lite} />}
      </div>
      <div data-flash aria-hidden className="invisible absolute inset-0 z-[5] bg-[radial-gradient(circle_at_50%_50%,#ffffff,#bfe8ff_35%,#050b1e_80%)]" />

      {/* Tagline and progress, top left */}
      <div data-bar-wrap className="absolute left-6 top-6 z-[6] hidden w-64 md:left-10 md:top-10 md:block">
        <p className="text-sm text-navy/60">{STUDIO.tagline}</p>
        <div className="mt-3 h-px w-full bg-navy/15">
          <div data-bar className="h-px origin-left scale-x-0 bg-signal" />
        </div>
      </div>

      {/* Skip */}
      <div className="absolute bottom-0 right-0 z-[6] p-6 md:p-10">
        <Magnetic>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className="btn bg-navy text-ink shadow-[0_10px_40px_-10px_rgba(10,23,51,0.6)] hover:bg-signal"
          >
            Enter studio
            <span aria-hidden className="inline-block size-2 rounded-full bg-sun" />
          </button>
        </Magnetic>
      </div>
    </div>
  );
}
