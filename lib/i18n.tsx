"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Two languages, English and Turkish. Every string sits next to its translation: t("English", "Türkçe").
 * First visit: Turkish browsers get Turkish, everyone else English. A choice made with the switch is remembered.
 */
export type Lang = "en" | "tr";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setL] = useState<Lang>("en");

  useEffect(() => {
    let l: Lang = "en";
    try {
      const saved = localStorage.getItem("mds-lang");
      if (saved === "tr" || saved === "en") l = saved;
      else if (navigator.language.toLowerCase().startsWith("tr")) l = "tr";
    } catch {}
    setL(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem("mds-lang", l);
    } catch {}
    setL(l);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(Ctx);
  const t = useCallback((en: string, tr: string) => (lang === "tr" ? tr : en), [lang]);
  return { lang, setLang, t };
}

/** The language switch: two buttons, the active one filled. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={lang === "tr" ? "Dil" : "Language"} className={`lang-switch ${className}`}>
      {(["tr", "en"] as const).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
