"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";
import { useLang } from "@/lib/i18n";

/**
 * Opening: the welcome film, full screen, and nothing else.
 * When it ends, the overlay fades away and then the site's own opening animation starts.
 * "Enter studio" (or Esc) skips it; the film starts muted, with a sound button.
 */
export default function Intro() {
  const { phase, enter } = useExperience();
  const { t } = useLang();
  const film = useRef<HTMLVideoElement>(null);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);
  const [muted, setMuted] = useState(true);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    // let the film fade out first, then hand over to the site
    window.setTimeout(() => {
      enter();
      setDone(true);
    }, 600);
  }, [closing, enter]);
  const closeRef = useRef(close);
  closeRef.current = close;

  // Play the film and open the site when it ends. If it cannot play at all, do not keep the visitor waiting.
  useEffect(() => {
    if (phase !== "intro") return;
    const v = film.current;
    if (!v) return;
    const close = () => closeRef.current();
    const onEnd = () => close();
    v.addEventListener("ended", onEnd);
    v.addEventListener("error", onEnd);
    v.play().catch(() => {});
    const stuck = window.setTimeout(() => {
      if (v.paused && v.currentTime === 0) close();
    }, 4000);
    const cap = window.setTimeout(close, 16000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("error", onEnd);
      window.clearTimeout(stuck);
      window.clearTimeout(cap);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  if (done) return null;
  if (phase === "entered") return null;

  return (
    <div
      data-intro-overlay
      role="dialog"
      aria-modal="true"
      aria-label={t("Welcome to Mode Digital Studio", "Mode Digital Studio'ya hoş geldiniz")}
      className={`fixed inset-0 z-[70] overflow-hidden bg-[#e9e8e6] transition-opacity duration-[600ms] ${closing ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <video
        ref={film}
        src={asset("/intro/welcome.mp4")}
        poster={asset("/intro/welcome.webp")}
        muted
        playsInline
        preload="auto"
        aria-label={t("The studio host walks in and welcomes you to Mode Digital Studio", "Stüdyo sunucusu içeri girip sizi Mode Digital Studio'ya davet ediyor")}
        className="intro-film absolute inset-0 size-full object-cover"
      />

      <div className="absolute bottom-0 right-0 flex items-center gap-3 p-6 md:p-10">
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
