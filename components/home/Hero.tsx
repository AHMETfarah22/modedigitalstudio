"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useExperience } from "@/lib/experience";
import Magnetic from "@/components/ui/Magnetic";
import { FEATURED, hostOf, logoTile } from "@/data/projects";
import { STUDIO } from "@/data/studio";
import { useLang } from "@/lib/i18n";
import { asset } from "@/lib/asset";

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

export default function Hero() {
  const { phase, reducedMotion } = useExperience();
  const root = useRef<HTMLElement>(null);
  const { t, lang } = useLang();
  const walk = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [idle, setIdle] = useState(false);

  // The host in 3D: once his walk-in ends he breathes and sways (CSS), turns toward the pointer,
  // and turns away as the page scrolls on. Every move is on the film itself (via CSS variables):
  // a transform on the wrapper would give it its own layer and break the white-multiply blend.
  useEffect(() => {
    if (phase !== "entered") return;
    const v = film.current;
    if (!v) return;
    if (reducedMotion) { setIdle(true); return; }
    const done = () => setIdle(true);
    v.addEventListener("ended", done);
    // autoplay blocked (low-power mode): the poster is already his last frame
    const check = window.setTimeout(() => { if (v.paused && v.currentTime === 0) done(); }, 1500);

    const tilt = { x: 0, y: 0 };
    const apply = () => {
      v.style.setProperty("--hw-tx", `${tilt.x.toFixed(2)}deg`);
      v.style.setProperty("--hw-ty", `${tilt.y.toFixed(2)}deg`);
    };
    const toX = gsap.quickTo(tilt, "x", { duration: 1.1, ease: "power3.out", onUpdate: apply });
    const toY = gsap.quickTo(tilt, "y", { duration: 1.1, ease: "power3.out", onUpdate: apply });
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const sec = root.current!;
    const par = { x: 0, y: 0 };
    const applyPar = () => {
      sec.style.setProperty("--px", par.x.toFixed(3));
      sec.style.setProperty("--py", par.y.toFixed(3));
    };
    const toPX = gsap.quickTo(par, "x", { duration: 1.4, ease: "power3.out", onUpdate: applyPar });
    const toPY = gsap.quickTo(par, "y", { duration: 1.4, ease: "power3.out", onUpdate: applyPar });
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      toY(nx * 16);
      toX(-ny * 6);
      toPX(nx);
      toPY(ny);
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });

    const turn = { a: 0, r: 0, d: 1 };
    const st = gsap.to(turn, {
      a: 22,
      r: -5,
      d: 0.86,
      ease: "none",
      onUpdate: () => {
        v.style.setProperty("--hw-turn", `${turn.a.toFixed(2)}deg`);
        v.style.setProperty("--hw-rise", `${turn.r.toFixed(2)}%`);
        v.style.setProperty("--hw-depth", turn.d.toFixed(3));
      },
      scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
    });

    return () => {
      v.removeEventListener("ended", done);
      window.clearTimeout(check);
      window.removeEventListener("pointermove", onMove);
      st.scrollTrigger?.kill();
      st.kill();
    };
  }, [phase, reducedMotion]);

  useGSAP(
    () => {
      if (phase !== "entered") return;
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        gsap.set(q("[data-hero-in]"), { autoAlpha: 1 });
        return;
      }
      const split = new SplitText(q("[data-hero-title] > span:not([data-caret])"), { type: "words,chars" });
      const title = q("[data-hero-title]")[0] as HTMLElement;
      const caret = q("[data-caret]")[0] as HTMLElement;
      const chars = split.chars as HTMLElement[];

      // the glowing light line sits right after a letter
      const caretTo = (el: HTMLElement | null, after = true) => {
        if (!el) { gsap.set(caret, { x: 0, y: 0 }); return; }
        const r = el.getBoundingClientRect(), b = title.getBoundingClientRect();
        gsap.set(caret, { x: (after ? r.right : r.left) - b.left + 4, y: r.top - b.top + r.height * 0.08, height: r.height * 0.82 });
      };

      // Types the heading letter by letter behind the light line, holds, erases, and types again every 30 s
      const typeLoop = () => {
        const loop = gsap.timeline({ repeat: -1 });
        loop
          .set(chars, { autoAlpha: 0 })
          .call(() => caretTo(chars[0], false))
          .fromTo(caret, { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2)" })
          .to(chars, {
            autoAlpha: 1,
            duration: 0.01,
            stagger: { each: 0.065, onStart(this: gsap.core.Tween) { caretTo(this.targets()[0] as HTMLElement); } },
          })
          .to({}, { duration: 30 - 0.45 - chars.length * 0.065 - chars.length * 0.022 - 0.6 })
          .to([...chars].reverse(), {
            autoAlpha: 0,
            duration: 0.01,
            stagger: { each: 0.022, onStart(this: gsap.core.Tween) { caretTo(this.targets()[0] as HTMLElement, false); } },
          })
          .to(caret, { scaleY: 0, autoAlpha: 0, duration: 0.3 }, "+=0.1")
          .to({}, { duration: 0.2 });
        return loop;
      };

      gsap.set(chars, { autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
      tl.set(q("[data-hero-in]"), { autoAlpha: 1 })
        .add(typeLoop(), 0.1)
        .from(q("[data-hero-sub]"), { y: 20, autoAlpha: 0, duration: 1 }, 1.6)
        .from(q("[data-hero-cta] > *"), { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 1.8)
        .from(q("[data-hero-foot]"), { autoAlpha: 0, duration: 1 }, 2.0);

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
    <section ref={root} id="top" className="hero-light relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* The same light studio as the welcome: porcelain wall, soft white light, a glowing ring */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-porcelain bg-[radial-gradient(60%_55%_at_70%_42%,#ffffff_0%,transparent_70%),radial-gradient(50%_40%_at_15%_100%,rgba(31,92,220,0.10),transparent_70%)]" />
      {/* A 3D studio floor he stands in: a perspective grid fading to the horizon, a pool of light under him */}
      <div aria-hidden className="hero-stage">
        <div className="hero-stage__floor" />
      </div>
      <div aria-hidden className="hero-ring" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-5 bg-gradient-to-b from-transparent to-night/40" />

      {/* The host walks into the right half and presents the heading. His film has a pure white
          background and is multiplied onto the page, so he walks on the page itself, with no box. */}
      {phase === "entered" && (
        <div ref={walk} className={`hero-walk${idle ? " is-idle" : ""}`}>
          <span aria-hidden className="hero-walk__pool" />
          <video
            ref={film}
            aria-hidden
            className="hero-walk__film"
            src={asset("/intro/host-walk.mp4")}
            poster={asset("/intro/host-walk-end.webp")}
            muted
            playsInline
            autoPlay={!reducedMotion}
            preload="auto"
          />
          <span aria-hidden className="hero-host__bubble hero-walk__bubble">{t("Scroll down to see our work", "Aşağı kaydırın, işlerimizi görün")}</span>
        </div>
      )}

      <div data-hero-in className="wrap invisible relative z-[2] order-1 flex flex-1 flex-col justify-center pb-10 pt-28 max-lg:flex-none max-lg:pb-2 lg:pt-32">
        <div data-hero-copy>
          <h1 key={lang} data-hero-title className="relative font-display text-[clamp(2.4rem,8.6vw,4.2rem)] font-extrabold leading-[1.08] tracking-[-0.04em] lg:text-[clamp(3rem,4.9vw,5.4rem)]">
            <span data-caret aria-hidden className="type-caret" />
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

      <div data-hero-foot data-hero-in className="wrap invisible relative z-[2] order-3 pb-8">
        <div className="flex flex-col gap-4 border-t border-line pt-6 text-sm text-mute md:flex-row md:items-center md:justify-between">
          <p>{t("Live now", "Şu an yayında")}</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {FEATURED.filter((p) => p.logo).map((p) => (
              <li key={p.slug}>
                <a href={p.liveUrl} target="_blank" rel="noopener" className="group flex min-h-11 items-center gap-3 rounded-full py-1 pl-1 pr-3 text-ink lg:bg-porcelain/85 lg:backdrop-blur-sm">
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
