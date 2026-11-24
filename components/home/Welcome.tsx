"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import Magnetic from "@/components/ui/Magnetic";
import { STUDIO } from "@/data/studio";
import { asset } from "@/lib/asset";
import ModeLogo from "@/components/ui/ModeLogo";
import { useLang } from "@/lib/i18n";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Closing scene: the host steps up from the bottom of the page and presents the studio mark
 * floating above his palm, with "You're always welcome." beside him.
 * After the entrance he keeps breathing, the mark keeps floating, and he leans toward the pointer.
 */
export default function Welcome() {
  const root = useRef<HTMLDivElement>(null);
  const { t, lang } = useLang();
  // the ball on his palm turns every 2 s between the mark and the studio's name
  const [face, setFace] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFace((f) => 1 - f), 2000);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const split = new SplitText(q("[data-say]"), { type: "words", mask: "words" });
      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
      });
      tl.from(q("[data-host]"), { yPercent: 35, autoAlpha: 0, duration: 1.4, ease: "power3.out" })
        .from(q("[data-halo]"), { scale: 0.4, autoAlpha: 0, duration: 1.6 }, 0.1)
        .from(q("[data-orb]"), { scale: 0, autoAlpha: 0, y: 40, duration: 1.1, ease: "back.out(2)" }, 0.8)
        .from(q("[data-bubble]"), { scale: 0.6, autoAlpha: 0, transformOrigin: "0% 100%", duration: 0.8, ease: "back.out(2.2)" }, 1.1)
        .from(split.words, { yPercent: 110, duration: 1, stagger: 0.07 }, 1.2)
        .from(q("[data-after] > *"), { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 1.6);

      // At the very end of the page he turns and walks out of the scene (scrolling back brings him back)
      gsap.to(q("[data-exit]"), {
        xPercent: -70,
        rotationY: -40,
        transformPerspective: 1200,
        transformOrigin: "50% 100%",
        autoAlpha: 0,
        ease: "power1.in",
        scrollTrigger: { trigger: q("[data-exit]")[0], start: "bottom bottom", end: () => ScrollTrigger.maxScroll(window), scrub: 0.8, invalidateOnRefresh: true },
      });

      // Idle life, always running once he is on screen
      gsap.to(q("[data-breathe]"), { y: -6, scaleY: 1.006, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" });
      gsap.to(q("[data-orb]"), { y: -14, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(q("[data-orb-ring]"), { rotate: 360, duration: 9, ease: "none", repeat: -1 });
      gsap.to(q("[data-halo]"), { scale: 1.06, opacity: 0.75, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      q("[data-spark]").forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 0, autoAlpha: 0, scale: 0.6 },
          { y: -70 - i * 12, autoAlpha: 1, scale: 1, duration: 2.4, ease: "power1.out", repeat: -1, delay: i * 0.55, repeatDelay: 0.4,
            onRepeat: () => gsap.set(el, { x: gsap.utils.random(-18, 18) }) },
        );
      });

      // Lean toward the pointer (fine pointers only)
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (!fine || !root.current) return () => split.revert();
      const lean = gsap.quickTo(q("[data-lean]")[0], "rotate", { duration: 1, ease: "power3.out" });
      const shift = gsap.quickTo(q("[data-lean]")[0], "x", { duration: 1, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        const r = root.current!.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        lean(nx * 3);
        shift(nx * 16);
      };
      root.current.addEventListener("pointermove", move);
      const el = root.current;
      return () => {
        el.removeEventListener("pointermove", move);
        split.revert();
      };
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  );

  return (
    <div ref={root} data-closing className="grid items-end gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
      {/* Host */}
      <div data-exit className="relative order-2 mx-auto w-full max-w-[460px] lg:order-1 lg:mx-0">
        <div data-halo aria-hidden className="absolute left-[8%] top-[6%] aspect-square w-[84%] rounded-full border-[10px] border-ring/25 shadow-[0_0_120px_rgba(43,184,255,0.35),inset_0_0_80px_rgba(43,184,255,0.18)]" />
        <div data-host className="relative">
          <div data-lean style={{ transformOrigin: "50% 100%" }}>
            <div data-breathe>
              <img
                src={asset("/intro/host.webp")}
                alt={t("The studio host smiling and presenting with an open hand", "Gülümseyen ve açık eliyle sunum yapan stüdyo sunucusu")}
                width={363}
                height={521}
                loading="lazy"
                className="relative block w-full select-none [mask-image:linear-gradient(to_bottom,#000_78%,transparent_99%)]"
                draggable={false}
              />
            </div>
          </div>

          {/* The studio mark, floating above his raised palm */}
          <div data-orb aria-hidden className="absolute left-[81%] top-[26%] aspect-square w-[18%]">
            <div className="absolute inset-[-55%] rounded-full bg-[radial-gradient(closest-side,rgba(43,184,255,0.55),transparent)] blur-md" />
            <span data-orb-ring className="absolute inset-[-12%] rounded-full border-2 border-dashed border-ring/70" />
            <span className="orb-flip absolute inset-0 rounded-full bg-night shadow-[0_0_0_3px_#2bb8ff,0_0_28px_6px_rgba(43,184,255,0.65)]" data-face={face}>
              <span className="orb-flip__face">
                <ModeLogo className="h-[52%] w-auto text-ink" />
              </span>
              <span className="orb-flip__face orb-flip__face--back">
                <span className="orb-name">
                  <b>MODE</b>
                  <span>DIGITAL</span>
                  <span>STUDIO</span>
                </span>
              </span>
            </span>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} data-spark aria-hidden className="absolute left-[88%] top-[41%] size-1.5 rounded-full bg-sun shadow-[0_0_8px_2px_rgba(255,209,102,0.8)]" />
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="order-1 pb-[clamp(2rem,8vw,7rem)] lg:order-2">
        <div data-bubble className="relative inline-block rounded-2xl rounded-bl-sm bg-ink px-5 py-3 font-semibold text-night shadow-[0_14px_40px_-12px_rgba(0,0,0,0.6)]">
          Her zaman bekleriz.
        </div>
        <h2 key={lang} data-say className="mt-6 text-[clamp(2.6rem,7vw,6.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
          {t("You’re always welcome.", "Kapımız her zaman açık.")}
        </h2>
        <div data-after>
          <p className="mt-8 max-w-[30rem] text-lg text-mute">
            {t("Tell us what you want to build. We reply on WhatsApp, weekdays between 10:00 and 20:00.", "Ne yapmak istediğinizi anlatın. Hafta içi 10:00 ile 20:00 arasında WhatsApp'tan yanıt veriyoruz.")}
          </p>
          <div className="mt-8">
            <Magnetic>
              <a href={STUDIO.whatsapp} target="_blank" rel="noopener" className="btn btn-sun text-base">
                {t("Start a project on WhatsApp", "WhatsApp'tan proje başlat")}
              </a>
            </Magnetic>
          </div>
          <p className="mt-10 font-display text-sm text-mute">{t(STUDIO.tagline, STUDIO.taglineTr)}</p>
        </div>
      </div>
    </div>
  );
}
