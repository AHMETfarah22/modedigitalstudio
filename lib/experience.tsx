"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Phase = "booting" | "intro" | "entered";

type Experience = {
  phase: Phase;
  enter: () => void;
  reducedMotion: boolean;
  /** Coarse pointer or narrow screen: lighter 3D, no custom cursor. */
  lite: boolean;
};

const Ctx = createContext<Experience | null>(null);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("booting");
  const [reducedMotion, setReduced] = useState(false);
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const sync = () => {
      setReduced(rm.matches);
      setLite(coarse.matches);
    };
    sync();
    rm.addEventListener("change", sync);
    coarse.addEventListener("change", sync);

    const seen = document.documentElement.dataset.intro === "seen";
    setPhase(seen ? "entered" : "intro");
    // remember at once, so a reload during the intro does not play it again
    try {
      localStorage.setItem("mds-intro", "1");
    } catch {}

    return () => {
      rm.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("is-locked", phase === "intro");
  }, [phase]);

  const enter = useCallback(() => {
    document.documentElement.dataset.intro = "seen";
    setPhase("entered");
    const hash = window.location.hash;
    if (hash) {
      requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView());
    }
  }, []);

  const value = useMemo(() => ({ phase, enter, reducedMotion, lite }), [phase, enter, reducedMotion, lite]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExperience() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExperience must be used inside ExperienceProvider");
  return v;
}

/** True when WebGL is usable. Checked once on the client. */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
