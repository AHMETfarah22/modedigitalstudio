"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { hasWebGL, useExperience } from "@/lib/experience";
import type { PortalProgress } from "@/components/three/PortalScene";
import Magnetic from "@/components/ui/Magnetic";
import { asset } from "@/lib/asset";
import ModeLogo from "@/components/ui/ModeLogo";
import { STUDIO } from "@/data/studio";
import { useLang } from "@/lib/i18n";

gsap.registerPlugin(SplitText, useGSAP);

const PortalScene = dynamic(() => import("@/components/three/PortalScene"), { ssr: false });

/**
 * Opening sequence:
 *  1. Porcelain stage. Four glowing orbs fly in from the four sides, collide and burst.
 *  2. In the flash the welcome film starts: the host walks in and welcomes the visitor;
 *  3. The room goes dark, a 3D portal opens and the camera flies through to the site.
 * "Enter studio" (or Esc) skips at any point; the film starts muted with a sound button.
 */
export default function Intro() {
  const { phase, enter, reducedMotion, lite } = useExperience();
  const { t } = useLang();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef<PortalProgress>({ p: 0 }).current;
  const [gl, setGl] = useState(false);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);
  const film = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

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

      const t = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.current = t;
      // Pieces stay hidden by CSS until the timeline owns them, so no finished frame flashes first.
      root.current?.classList.add("is-playing");
      // Dev only: lets the intro be scrubbed from the console (window.__introTl.seek(4)).
      if (process.env.NODE_ENV !== "production") (window as unknown as { __introTl?: gsap.core.Timeline }).__introTl = t;

      if (reducedMotion) {
        t.set(q("[data-film]"), { autoAlpha: 1 })
          .from(q("[data-stage]"), { autoAlpha: 0, duration: 0.6 })
          .to({}, { duration: 2.4 })
          .add(() => close());
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Four orbs rush in from the four sides, collide in the middle and burst like a bomb
      const sides = q("[data-orb-side]");
      const HIT = 1.25;
      t.set(q("[data-orb]"), { x: -vw * 0.58, y: 0, scale: 0.5, autoAlpha: 0 })
        .set(sides[0], { x: vw * 0.58, y: 0, autoAlpha: 0 })
        .set(sides[1], { x: 0, y: -vh * 0.62, autoAlpha: 0 })
        .set(sides[2], { x: 0, y: vh * 0.62, autoAlpha: 0 })
        .to([q("[data-orb]"), ...sides], { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.15)
        .to([q("[data-orb]"), ...sides], { x: 0, y: 0, duration: HIT - 0.2, ease: "power3.in" }, 0.2)
        .to(q("[data-orb-spin]"), { rotateY: 540, rotateX: 200, duration: 2.2, ease: "power2.inOut" }, 0.2)
        .to(sides, { scale: 0, autoAlpha: 0, duration: 0.15, ease: "power2.in" }, HIT)
        .fromTo(q("[data-blast]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: "power4.in" }, HIT)
        .to(q("[data-blast]"), { autoAlpha: 0, duration: 0.9, ease: "power2.out" }, HIT + 0.1)
        .fromTo(q("[data-shock]"), { scale: 0.4, autoAlpha: 1 }, { scale: 16, autoAlpha: 0, duration: 1.2, ease: "power2.out", stagger: 0.12 }, HIT)
        .fromTo(
          q("[data-spark-burst]"),
          { x: 0, y: 0, scale: 1, autoAlpha: 1 },
          {
            x: () => Math.cos(Math.random() * Math.PI * 2) * (vw * (0.18 + Math.random() * 0.28)),
            y: () => Math.sin(Math.random() * Math.PI * 2) * (vh * (0.18 + Math.random() * 0.3)),
            scale: () => 0.4 + Math.random(),
            autoAlpha: 0,
            duration: () => 0.9 + Math.random() * 0.6,
            ease: "power3.out",
          },
          HIT,
        )
        .fromTo(root.current, { x: 0, y: 0 }, { x: () => (Math.random() - 0.5) * 18, y: () => (Math.random() - 0.5) * 14, duration: 0.05, repeat: 7, yoyo: true, ease: "none", clearProps: "x,y" }, HIT)
        .fromTo(q("[data-orb]"), { scale: 0.5 }, { scale: 1.6, duration: 0.25, ease: "back.out(3)" }, HIT)
        .to(q("[data-orb]"), { scale: 5, autoAlpha: 0, duration: 0.8, ease: "power2.out" }, HIT + 0.1)
        // the welcome film fades in under the flash and starts playing
        .fromTo(q("[data-film]"), { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: "power2.out" }, HIT)
        .call(() => { film.current?.play().catch(() => {}); }, [], HIT)
        .to(q("[data-bar]"), { scaleX: 1, duration: HIT + 4.4, ease: "none" }, 0)
        .addLabel("portal", HIT + 4.4);

      if (!gl) {
        // No WebGL: the mark expands past the screen instead of the 3D portal.
        t.to(q("[data-stage]"), { autoAlpha: 0, scale: 0.97, duration: 0.6, ease: "power2.in" }, "portal")
          .to(q("[data-night]"), { autoAlpha: 1, duration: 0.6 }, "portal")
          .fromTo(q("[data-orb]"), { scale: 1, autoAlpha: 1 }, { scale: 24, duration: 1.4, ease: "power3.in" }, "portal+=0.2")
          .add(() => close(), "portal+=1.5");
        return;
      }

      t.to(q("[data-stage]"), { autoAlpha: 0, scale: 0.96, filter: "blur(6px)", duration: 0.7, ease: "power2.in" }, "portal")
        .to(q("[data-night]"), { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, "portal")
        .to(q("[data-bar-wrap]"), { autoAlpha: 0, duration: 0.4 }, "portal")
        .to(q("[data-canvas]"), { autoAlpha: 1, duration: 0.6 }, "portal+=0.35")
        .to(progress, { p: 1, duration: 3.6, ease: "power1.inOut" }, "portal+=0.35")
        .to(q("[data-flash]"), { autoAlpha: 1, duration: 0.35, ease: "power2.in" }, "portal+=3.55")
        .add(() => close(), "portal+=3.9");

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
      aria-label={t("Welcome to Mode Digital Studio", "Mode Digital Studio'ya hoş geldiniz")}
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

      {/* Three more orbs that fly in from the other sides and collide with the first */}
      {[0, 1, 2].map((i) => (
        <div key={i} data-orb-side aria-hidden className="invisible pointer-events-none absolute left-1/2 top-1/2 z-[1] -ml-10 -mt-10 size-20">
          <div className="absolute inset-[-60%] rounded-full bg-[radial-gradient(closest-side,rgba(43,184,255,0.55),transparent)] blur-md" />
          <span className="absolute inset-0 rounded-full border-4 border-ring shadow-[0_0_22px_rgba(43,184,255,0.8)]" />
          <span className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun shadow-[0_0_24px_6px_rgba(255,209,102,0.7)]" />
        </div>
      ))}

      {/* The burst: a white flash, shock rings and sparks */}
      <div data-blast aria-hidden className="invisible pointer-events-none absolute inset-0 z-[6] bg-[radial-gradient(circle_at_50%_50%,#ffffff_0%,#dff4ff_25%,rgba(191,232,255,0.6)_45%,transparent_75%)]" />
      {[0, 1, 2].map((i) => (
        <span key={i} data-shock aria-hidden className="invisible pointer-events-none absolute left-1/2 top-1/2 z-[5] -ml-14 -mt-14 size-28 rounded-full border-[6px] border-ring shadow-[0_0_40px_rgba(43,184,255,0.7),inset_0_0_30px_rgba(255,209,102,0.5)]" />
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <span key={i} data-spark-burst aria-hidden className={`invisible pointer-events-none absolute left-1/2 top-1/2 z-[5] -ml-1 -mt-1 rounded-full ${i % 3 === 0 ? "size-3 bg-sun shadow-[0_0_14px_4px_rgba(255,209,102,0.8)]" : "size-2 bg-ring shadow-[0_0_12px_3px_rgba(43,184,255,0.8)]"}`} />
      ))}

      {/* Stage A: the welcome film. It starts in the flash of the burst. */}
      <div data-stage className="absolute inset-0 z-[2]">
        <video
          ref={film}
          data-film
          src={asset("/intro/welcome.mp4")}
          poster={asset("/intro/welcome.webp")}
          muted
          playsInline
          preload="auto"
          aria-label={t("The studio host walks in and welcomes you to Mode Digital Studio", "Stüdyo sunucusu içeri girip sizi Mode Digital Studio'ya davet ediyor")}
          className="intro-film invisible absolute inset-0 size-full object-cover"
        />
        {/* soft light and a gentle fade at the bottom */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_55%,rgba(10,23,51,0.10)),linear-gradient(to_top,rgba(238,242,250,0.92),rgba(238,242,250,0)_34%)]" />

      </div>

      {/* Stage B: the portal */}
      <div data-night aria-hidden className="invisible absolute inset-0 z-[3] bg-night bg-[radial-gradient(60%_60%_at_50%_50%,#0a1733,#050b1e)]" />
      <div data-canvas aria-hidden className="invisible absolute inset-0 z-[4]">
        {gl && <PortalScene progress={progress} lite={lite} />}
      </div>
      <div data-flash aria-hidden className="invisible absolute inset-0 z-[5] bg-[radial-gradient(circle_at_50%_50%,#ffffff,#bfe8ff_35%,#050b1e_80%)]" />

      {/* Tagline and progress, top left */}
      <div data-bar-wrap className="absolute left-6 top-6 z-[6] hidden w-64 md:left-10 md:top-10 md:block">
        <p className="text-sm text-navy/60">{t(STUDIO.tagline, STUDIO.taglineTr)}</p>
        <div className="mt-3 h-px w-full bg-navy/15">
          <div data-bar className="h-px origin-left scale-x-0 bg-signal" />
        </div>
      </div>

      {/* Skip */}
      <div className="absolute bottom-0 right-0 z-[6] flex items-center gap-3 p-6 md:p-10">
        <button
          type="button"
          onClick={() => {
            const v = film.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
            if (v.paused) v.play().catch(() => {});
          }}
          aria-pressed={!muted}
          className="btn btn-sm border border-navy/20 bg-white/70 text-navy backdrop-blur hover:bg-white"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9z" />
            {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
          </svg>
          {muted ? t("Sound on", "Sesi aç") : t("Sound off", "Sesi kapat")}
        </button>
        <Magnetic>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className="btn bg-navy text-ink shadow-[0_10px_40px_-10px_rgba(10,23,51,0.6)] hover:bg-signal"
          >
            {t("Enter studio", "Stüdyoya gir")}
            <span aria-hidden className="inline-block size-2 rounded-full bg-sun" />
          </button>
        </Magnetic>
      </div>
    </div>
  );
}
