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
 *  1. The welcome film: the host walks in and welcomes the visitor.
 *  2. The room goes dark, a 3D portal opens and the camera flies through to the site.
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
      // make sure the overlay (and its 3D portal) is really removed even if that fade is cut short
      window.setTimeout(() => setDone(true), fast ? 700 : 1100);
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

      // The welcome film starts straight away
      const HIT = 0.2;
      t.fromTo(q("[data-film]"), { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 1, ease: "power2.out" }, HIT)
        .call(() => { film.current?.play().catch(() => {}); }, [], HIT)
        .to(q("[data-bar]"), { scaleX: 1, duration: HIT + 4.4, ease: "none" }, 0)
        // Wait here until the film has really finished (its "Welcome" has fully dissolved),
        // however long it took to load, then hold its last frame for a beat before moving on.
        .addPause(HIT + 4.0, () => {
          const v = film.current;
          const go = () => gsap.delayedCall(0.6, () => t.play());
          if (!v || v.ended || v.error) go();
          else v.addEventListener("ended", go, { once: true });
        })
        .addLabel("portal", HIT + 4.01);
      // safety net: if the film never plays (blocked, offline), carry on anyway
      gsap.delayedCall(11, () => { if (t.paused()) t.play(); });

      if (!gl) {
        // No WebGL: the mark expands past the screen instead of the 3D portal.
        t.to(q("[data-stage]"), { autoAlpha: 0, scale: 0.97, duration: 0.6, ease: "power2.in" }, "portal")
          .to(q("[data-night]"), { autoAlpha: 1, duration: 0.6 }, "portal")
          .fromTo(q("[data-orb]"), { scale: 1, autoAlpha: 1 }, { scale: 24, duration: 1.4, ease: "power3.in" }, "portal+=0.2")
          .add(() => close(), "portal+=1.5");
        return;
      }

      // the film drifts back and softens, then the room dims into the portal
      t.to(q("[data-film]"), { scale: 1.08, filter: "blur(8px) brightness(1.08)", duration: 1.1, ease: "power2.in" }, "portal")
        .to(q("[data-stage]"), { autoAlpha: 0, duration: 0.9, ease: "power2.in" }, "portal+=0.2")
        .to(q("[data-night]"), { autoAlpha: 1, duration: 0.9, ease: "power2.inOut" }, "portal+=0.3")
        .to(q("[data-bar-wrap]"), { autoAlpha: 0, duration: 0.4 }, "portal")
        .to(q("[data-canvas]"), { autoAlpha: 1, duration: 0.6 }, "portal+=0.6")
        .to(progress, { p: 1, duration: 3.6, ease: "power1.inOut" }, "portal+=0.6")
        .to(q("[data-flash]"), { autoAlpha: 1, duration: 0.35, ease: "power2.in" }, "portal+=3.8")
        .add(() => close(), "portal+=4.15");

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
