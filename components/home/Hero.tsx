"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { hasWebGL, useExperience } from "@/lib/experience";
import Magnetic from "@/components/ui/Magnetic";
import { FEATURED, hostOf, logoTile } from "@/data/projects";
import { STUDIO } from "@/data/studio";
import { useLang } from "@/lib/i18n";
import { asset } from "@/lib/asset";

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

const HeroField = dynamic(() => import("@/components/three/HeroField"), { ssr: false });

export default function Hero() {
  const { phase, lite, reducedMotion } = useExperience();
  const root = useRef<HTMLElement>(null);
  const [gl, setGl] = useState(false);
  const { t, lang } = useLang();

  useEffect(() => {
    if (phase === "entered") setGl(hasWebGL());
  }, [phase]);

  useGSAP(
    () => {
      if (phase !== "entered") return;
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        gsap.set(q("[data-hero-in]"), { autoAlpha: 1 });
        return;
      }
      const split = new SplitText(q("[data-hero-title] > span"), { type: "words,chars", mask: "chars" });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
      tl.set(q("[data-hero-in]"), { autoAlpha: 1 })
        .from(split.chars, { yPercent: 105, duration: 1.2, stagger: 0.022 })
        .from(q("[data-hero-sub]"), { y: 20, autoAlpha: 0, duration: 1 }, 0.55)
        .from(q("[data-hero-cta] > *"), { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.7)
        .from(q("[data-hero-foot]"), { autoAlpha: 0, duration: 1 }, 0.9);

      // Subtle parallax: the copy drifts up a little faster than the page.
      gsap.to(q("[data-hero-copy]"), {
        yPercent: -14,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      return () => split.revert();
    },
    { scope: root, dependencies: [phase, reducedMotion, lang], revertOnUpdate: true },
  );

  return (
    <section ref={root} id="top" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_72%_45%,#10204a_0%,#050b1e_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10">
        {gl ? (
          <HeroField lite={lite} />
        ) : (
          <div className="absolute right-[-10%] top-1/2 aspect-square w-[min(80vw,820px)] -translate-y-1/2 rounded-full border-[18px] border-ring/30 shadow-[0_0_120px_rgba(43,184,255,0.35),inset_0_0_120px_rgba(43,184,255,0.25)]" />
        )}
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-night" />

      {/* The host stands in the empty right half and points down to the work */}
      {phase === "entered" && (
        <div aria-hidden className="hero-host">
          <span className="hero-host__light" />
          <span className="hero-host__bubble">{t("Scroll down to see our work", "Aşağı kaydırın, işlerimizi görün")}</span>
          <span className="hero-host__sign">
            <svg viewBox="0 0 24 24"><path d="M12 4v15 M6 13l6 6 6-6" /></svg>
          </span>
          <span className="hero-host__fig">
            <img src={asset("/intro/pose-4.webp")} alt="" width={173} height={490} draggable={false} />
          </span>
          <span className="hero-host__floor" />
        </div>
      )}

      <div data-hero-in className="wrap invisible relative z-[2] flex flex-1 flex-col justify-center pb-10 pt-32">
        <div data-hero-copy>
          <h1 key={lang} data-hero-title className="font-display text-[clamp(2.6rem,7.4vw,7.6rem)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            <span className="block">{t("WE CREATE.", "TASARLARIZ.")}</span>
            <span className="block">{t("WE BUILD.", "GELİŞTİRİRİZ.")}</span>
            <span className="block">{t("WE ANIMATE.", "CANLANDIRIRIZ.")}</span>
          </h1>
          <p data-hero-sub className="mt-8 max-w-[34rem] text-[clamp(1.1rem,1.6vw,1.35rem)] leading-relaxed text-mute">
            {t(
              "Transforming ideas into powerful digital experiences. Websites, software, games and animation from the studio of Mode Academy.",
              "Fikirleri güçlü dijital deneyimlere dönüştürüyoruz. Mode Academy'nin stüdyosundan web siteleri, yazılım, oyun ve animasyon.",
            )}
          </p>
          <div data-hero-cta className="mt-10 flex flex-wrap gap-3">
            <Magnetic>
              <a href="#work" className="btn btn-sun">
                {t("See the work", "İşleri gör")}
              </a>
            </Magnetic>
            <Magnetic>
              <a href={STUDIO.whatsapp} target="_blank" rel="noopener" className="btn btn-line">
                {t("Start a project", "Proje başlat")}
              </a>
            </Magnetic>
          </div>
        </div>
      </div>

      <div data-hero-foot data-hero-in className="wrap invisible relative z-[2] pb-8">
        <div className="flex flex-col gap-4 border-t border-line pt-6 text-sm text-mute md:flex-row md:items-center md:justify-between">
          <p>{t("Live now", "Şu an yayında")}</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {FEATURED.filter((p) => p.logo).map((p) => (
              <li key={p.slug}>
                <a href={p.liveUrl} target="_blank" rel="noopener" className="group flex min-h-11 items-center gap-3 text-ink">
                  {p.logo && (
                    <img src={p.logo} alt="" width={28} height={28} className={`size-7 rounded-md object-contain p-0.5 ${logoTile(p)}`} />
                  )}
                  <span className="link-draw">{hostOf(p.liveUrl!)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
