"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { hasWebGL, useExperience } from "@/lib/experience";
import type { PortalProgress } from "@/components/three/PortalScene";
import { asset } from "@/lib/asset";
import { useLang } from "@/lib/i18n";

const PortalScene = dynamic(() => import("@/components/three/PortalScene"), { ssr: false });

/**
 * Opening:
 *  1. The welcome film, full screen, and nothing else.
 *  2. Only once it has ended: the room dims, the blue 3D portal opens and the camera flies through.
 *  3. A flash of light, and the site's own opening animation starts.
 * "Enter studio" (or Esc) skips straight to the site; the film starts muted, with a sound button.
 */
export default function Intro() {
  const { phase, enter, reducedMotion, lite } = useExperience();
  const { t } = useLang();
  const root = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const progress = useRef<PortalProgress>({ p: 0 }).current;
  const portalTl = useRef<gsap.core.Timeline | null>(null);
  const [gl, setGl] = useState(false);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (phase === "intro") setGl(!reducedMotion && hasWebGL());
  }, [phase, reducedMotion]);

  // Fade the overlay away, then hand over to the site (its own opening animation starts on enter)
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    portalTl.current?.kill();
    window.setTimeout(() => {
      enter();
      setDone(true);
    }, 600);
  }, [closing, enter]);
  const closeRef = useRef(close);
  closeRef.current = close;

  // The blue portal, played only after the film has finished
  const portal = useCallback(() => {
    const el = root.current;
    if (!el || portalTl.current) return;
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline();
    portalTl.current = tl;
    tl.to(q("[data-film]"), { scale: 1.08, filter: "blur(8px) brightness(1.08)", duration: 1, ease: "power2.in" }, 0)
      .to(q("[data-film]"), { autoAlpha: 0, duration: 0.8, ease: "power2.in" }, 0.2)
      .to(q("[data-night]"), { autoAlpha: 1, duration: 0.9, ease: "power2.inOut" }, 0.3);
    if (gl) {
      tl.to(q("[data-canvas]"), { autoAlpha: 1, duration: 0.6 }, 0.6)
        .to(progress, { p: 1, duration: 3.6, ease: "power1.inOut" }, 0.6)
        .to(q("[data-flash]"), { autoAlpha: 1, duration: 0.35, ease: "power2.in" }, 3.8)
        .add(() => closeRef.current(), 4.15);
    } else {
      tl.add(() => closeRef.current(), 1.3);
    }
  }, [gl, progress]);
  const portalRef = useRef(portal);
  portalRef.current = portal;

  // Play the film; when it ends, run the portal. If the film cannot play, do not keep the visitor waiting.
  useEffect(() => {
    if (phase !== "intro") return;
    const v = film.current;
    if (!v) return;
    const toPortal = () => portalRef.current();
    v.addEventListener("ended", toPortal);
    v.addEventListener("error", toPortal);
    v.play().catch(() => {});
    const stuck = window.setTimeout(() => {
      if (v.paused && v.currentTime === 0) toPortal();
    }, 4000);
    const cap = window.setTimeout(() => closeRef.current(), 22000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      v.removeEventListener("ended", toPortal);
      v.removeEventListener("error", toPortal);
      window.clearTimeout(stuck);
      window.clearTimeout(cap);
      window.removeEventListener("keydown", onKey);
      portalTl.current?.kill();
    };
  }, [phase]);

  if (done) return null;
  if (phase === "entered") return null;

  return (
    <div
      ref={root}
      data-intro-overlay
      role="dialog"
      aria-modal="true"
      aria-label={t("Welcome to Mode Digital Studio", "Mode Digital Studio'ya hoş geldiniz")}
      className={`fixed inset-0 z-[70] overflow-hidden bg-[#e9e8e6] transition-opacity duration-[600ms] ${closing ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <video
        ref={film}
        data-film
        src={asset("/intro/welcome.mp4")}
        poster={asset("/intro/welcome.webp")}
        muted
        playsInline
        preload="auto"
        aria-label={t("The studio host walks in and welcomes you to Mode Digital Studio", "Stüdyo sunucusu içeri girip sizi Mode Digital Studio'ya davet ediyor")}
        className="intro-film absolute inset-0 size-full object-cover"
      />

      {/* The portal: dark room, the blue 3D portal, and the flash at the end */}
      <div data-night aria-hidden className="invisible absolute inset-0 z-[3] bg-night bg-[radial-gradient(60%_60%_at_50%_50%,#0a1733,#050b1e)]" />
      <div data-canvas aria-hidden className="invisible absolute inset-0 z-[4]">
        {gl && <PortalScene progress={progress} lite={lite} />}
      </div>
      <div data-flash aria-hidden className="invisible absolute inset-0 z-[5] bg-[radial-gradient(circle_at_50%_50%,#ffffff,#bfe8ff_35%,#050b1e_80%)]" />

      <div className="absolute bottom-0 right-0 z-[6] flex items-center gap-3 p-6 md:p-10">
        <button
          type="button"
          onClick={() => {
            const v = film.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
            if (v.paused && !v.ended) v.play().catch(() => {});
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
        <button
          type="button"
          autoFocus
          onClick={close}
          className="btn bg-navy text-ink shadow-[0_10px_40px_-10px_rgba(10,23,51,0.6)] hover:bg-signal"
        >
          {t("Enter studio", "Stüdyoya gir")}
          <span aria-hidden className="inline-block size-2 rounded-full bg-sun" />
        </button>
      </div>
    </div>
  );
}
