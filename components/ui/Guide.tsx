"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { asset } from "@/lib/asset";
import { useLang } from "@/lib/i18n";
import ModeLogo from "@/components/ui/ModeLogo";

/**
 * The studio host walks the visitor through the page: he steps in at the corner after the hero,
 * presents each section with a speech bubble, leans toward the pointer, and steps out when the
 * closing scene (where he appears full size) comes into view. Clicking him goes to the contact scene.
 */

const LINES: { anchor: string; say: string; sayTr: string }[] = [
  { anchor: "#work", say: "These sites are live. Open one and look around.", sayTr: "Bu siteler yayında. Birini açıp gezin." },
  { anchor: "#concepts-title", say: "Concept sites for local shops. Try one.", sayTr: "Yerel dükkânlar için konsept siteler. Birini deneyin." },
  { anchor: "#motion", say: "Our games, VR and films. Tap a card to watch.", sayTr: "Oyunlarımız, VR ve filmlerimiz. İzlemek için bir karta dokunun." },
  { anchor: "#documents", say: "Leaf through the Mode Academy brochure.", sayTr: "Mode Academy kitapçığını çevirin." },
  { anchor: "#about", say: "This is what the studio makes.", sayTr: "Stüdyonun yaptıkları bunlar." },
];

/**
 * He stands bottom right, so every pose faces left, toward the page:
 * 1 presents with both hands (the mark floats on his palm), 2 raises a finger, 3 points down.
 * `ax` is where his feet are across the picture, so the poses line up.
 */
const POSES = [
  { src: "/intro/pose-5.webp", w: 203, h: 495, ax: 0.637 },
  { src: "/intro/pose-2.webp", w: 183, h: 493, ax: 0.446 },
  { src: "/intro/pose-4.webp", w: 173, h: 490, ax: 0.498 },
];

/** Gestures he cycles through: a pose, a body move, and a sign that pops up over his head. */
const ACTS = {
  point: { pose: 1, sign: "M12 4v10 M12 19v.5", tone: "sun" },
  think: { pose: 2, sign: "M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4 M12 18.5v.5", tone: "ring" },
  idea: { pose: 2, sign: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z", tone: "sun" },
  nod: { pose: 1, sign: "M5 12.5l4.5 4.5L19 7", tone: "green" },
  wave: { pose: 1, sign: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z", tone: "pink" },
  spin: { pose: 1, sign: "M12 3l2.2 6.3L21 9.5l-5.4 4 2 6.5L12 16l-5.6 4 2-6.5-5.4-4 6.8-.2z", tone: "sun" },
  down: { pose: 3, sign: "M12 4v15 M6 13l6 6 6-6", tone: "ring" },
  surprise: { pose: 1, sign: "M12 4v10 M12 19v.5", tone: "sun" },
} as const;
type Act = keyof typeof ACTS;
const IDLE: Act[] = ["think", "nod", "idea", "wave", "spin", "down", "point"];

export default function Guide() {
  const { phase, reducedMotion } = useExperience();
  const { t } = useLang();
  const [line, setLine] = useState(-1);
  const [show, setShow] = useState(false);
  const [act, setAct] = useState<{ name: Act; n: number } | null>(null);
  const [quiet, setQuiet] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Which section is in the middle of the screen, and is the closing scene in view
  useEffect(() => {
    if (phase !== "entered") return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let n = -1;
      LINES.forEach((l, i) => {
        const el = document.querySelector(l.anchor);
        if (el && el.getBoundingClientRect().top < mid) n = i;
      });
      const foot = document.querySelector("#contact");
      const footIn = foot ? foot.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
      setShow(n >= 0 && !footIn);
      setLine((prev) => (prev === n ? prev : n));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [phase]);

  // A small hop each time he starts a new line
  // and, after a few seconds, he steps back so he never sits on the content for long
  useEffect(() => {
    if (line < 0) return;
    setAct((a) => ({ name: line === 0 ? "down" : "point", n: (a?.n ?? 0) + 1 }));
    setQuiet(false);
    const t = window.setTimeout(() => setQuiet(true), 4500);
    return () => window.clearTimeout(t);
  }, [line]);

  // While he is on screen he does something every few seconds, never the same twice in a row
  useEffect(() => {
    if (!show || reducedMotion) return;
    let t = 0;
    const next = () => {
      t = window.setTimeout(() => {
        setAct((a) => {
          const pool = IDLE.filter((x) => x !== a?.name);
          return { name: pool[Math.floor(Math.random() * pool.length)], n: (a?.n ?? 0) + 1 };
        });
        next();
      }, 4200 + Math.random() * 3000);
    };
    next();
    return () => window.clearTimeout(t);
  }, [show, reducedMotion]);

  // Lean toward the pointer, in 3D
  useEffect(() => {
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;
    const el = tiltRef.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      el.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 8}deg)`;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reducedMotion, phase]);

  if (phase !== "entered") return null;
  const say = line >= 0 ? t(LINES[line].say, LINES[line].sayTr) : "";

  return (
    <a
      href="#contact"
      aria-label={t("Talk to the studio", "Stüdyoyla konuşun")}
      className={`guide ${show ? "is-on" : ""} ${quiet ? "is-quiet" : ""}`}
      onClick={(e) => {
        const lenis = window.__lenis;
        if (lenis) { e.preventDefault(); lenis.scrollTo("#contact"); }
      }}
    >
      <span key={`b${line}`} className="guide__bubble" aria-live="polite">{say}</span>
      <span className="guide__stage">
        <span ref={tiltRef} className="guide__tilt">
          <span key={`a${act?.n ?? 0}`} className={`guide__act ${act ? `act-${act.name}` : ""}`}>
            <span className="guide__breathe">
              {POSES.map((p, i) => (
                <span
                  key={p.src}
                  className={`guide__pose ${(act ? ACTS[act.name].pose : 1) === i + 1 ? "is-on" : ""}`}
                  style={{ aspectRatio: `${p.w} / ${p.h}`, ["--ax" as string]: p.ax } as React.CSSProperties}
                >
                  <img src={asset(p.src)} alt="" width={p.w} height={p.h} draggable={false} />
                  {i === 0 && (
                    <span className="guide__orb" aria-hidden>
                      <span className="guide__orb-ring" />
                      <span className="guide__orb-core"><ModeLogo className="h-[52%] w-auto text-ink" /></span>
                    </span>
                  )}
                </span>
              ))}
            </span>
            {act && (
              <span className={`guide__sign tone-${ACTS[act.name].tone}`} aria-hidden>
                <svg viewBox="0 0 24 24"><path d={ACTS[act.name].sign} /></svg>
              </span>
            )}
          </span>
        </span>
        <span className="guide__floor" aria-hidden />
      </span>
    </a>
  );
}
