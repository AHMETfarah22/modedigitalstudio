"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/lib/experience";
import { useLang } from "@/lib/i18n";

/**
 * A route that runs down the left margin of the page and draws itself as you scroll.
 * A glowing marker travels at its tip; every section has a signpost that lights up
 * and unfolds its name when the marker reaches it. The route ends at the welcome scene.
 * Cards across the page rise into place as they come into view.
 */

type Stop = { id: string; label: string; labelTr: string; icon: keyof typeof ICONS; y: number };

const STOPS: { id: string; anchor: string; label: string; labelTr: string; icon: keyof typeof ICONS; mode: "section" | "heading" }[] = [
  { id: "work", anchor: "#work", label: "Live websites", labelTr: "Canlı siteler", icon: "browser", mode: "section" },
  { id: "concepts", anchor: "#concepts-title", label: "Concept sites", labelTr: "Konsept siteler", icon: "shop", mode: "heading" },
  { id: "motion", anchor: "#motion", label: "Motion", labelTr: "Videolar", icon: "play", mode: "section" },
  { id: "documents", anchor: "#documents", label: "Brochure", labelTr: "Kitapçık", icon: "book", mode: "section" },
  { id: "about", anchor: "#about", label: "The studio", labelTr: "Stüdyo", icon: "spark", mode: "section" },
  { id: "contact", anchor: "#contact", label: "Say hello", labelTr: "Merhaba deyin", icon: "plane", mode: "section" },
];

const ICONS = {
  browser: "M3 5h18v14H3z M3 9h18 M6 7h.01 M8.5 7h.01 M13 13l5 2-2 1-1 2z",
  shop: "M4 10v9h16v-9 M3 6l2-3h14l2 3v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z M10 19v-5h4v5",
  play: "M4 6h16v13H4z M4 6l3-3h4l-3 3 M10 3h4l-3 3 M10 10v6l5-3z",
  book: "M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z M12 6v14.5",
  spark: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5L18 18 M6 18l2.5-2.5 M15.5 8.5L18 6 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  plane: "M21 3L3 10.5l7 2.5 2.5 7z M10 13l11-10",
};

export default function ScrollJourney() {
  const { phase, reducedMotion } = useExperience();
  const { t } = useLang();
  const svgRef = useRef<SVGSVGElement>(null);
  const drawRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; x: number; d: string; stops: Stop[]; compact: boolean; y0: number; y1: number } | null>(null);
  const [lit, setLit] = useState(-1);

  // Measure the page and lay the route out
  useEffect(() => {
    if (phase !== "entered") return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const wrap = document.querySelector<HTMLElement>("#work .wrap");
        const hero = document.querySelector<HTMLElement>("#top");
        const foot = document.querySelector<HTMLElement>("#contact");
        if (!wrap || !hero || !foot) return;
        const sy = window.scrollY;
        const cs = getComputedStyle(wrap);
        // the margin left of the content; the host's column (wide screens) is not part of it
        const contentLeft = wrap.getBoundingClientRect().left + parseFloat(cs.paddingRight);
        const compact = contentLeft < 56;
        const x = compact ? Math.max(8, contentLeft * 0.42) : contentLeft / 2;
        const stops: Stop[] = [];
        for (const s of STOPS) {
          const el = document.querySelector<HTMLElement>(s.anchor);
          if (!el) continue;
          const top = el.getBoundingClientRect().top + sy;
          const pad = s.mode === "section" ? parseFloat(getComputedStyle(el).paddingTop) || 96 : 0;
          const y = s.mode === "section" ? top + Math.min(pad * 0.45, 80) : top - 46;
          stops.push({ id: s.id, label: s.label, labelTr: s.labelTr, icon: s.icon, y });
        }
        const y0 = hero.getBoundingClientRect().bottom + sy - 40;
        const y1 = foot.getBoundingClientRect().top + sy + Math.min(foot.offsetHeight * 0.55, 420);
        const amp = compact ? Math.max(4, x - 4) : Math.min(x - 10, 26);
        const pts = [y0, ...stops.map((s) => s.y), y1];
        let d = `M ${x} ${y0}`;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], m = (b - a) / 3, side = i % 2 ? 1 : -1;
          d += ` C ${x + amp * side} ${a + m}, ${x - amp * side} ${b - m}, ${x} ${b}`;
        }
        setGeo({ w: document.documentElement.clientWidth, h: document.documentElement.scrollHeight, x, d, stops, compact, y0, y1 });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [phase]);

  // Draw the route to the point that matches the scroll position
  useEffect(() => {
    const path = drawRef.current, dot = dotRef.current;
    if (!geo || !path || !dot) return;
    const L = path.getTotalLength();
    // lookup: y -> length
    const N = 600, ys = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) ys[i] = path.getPointAtLength((L * i) / N).y;
    const lenAt = (y: number) => {
      if (y <= ys[0]) return 0;
      if (y >= ys[N]) return L;
      let lo = 0, hi = N;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ys[mid] < y) lo = mid; else hi = mid; }
      const t = (y - ys[lo]) / Math.max(1e-3, ys[hi] - ys[lo]);
      return (L * (lo + t)) / N;
    };
    path.style.strokeDasharray = `${L} ${L}`;
    let ticking = false, last = -2;
    const update = () => {
      ticking = false;
      const tip = reducedMotion ? geo.y1 : window.scrollY + window.innerHeight * 0.62;
      const len = lenAt(tip);
      path.style.strokeDashoffset = String(L - len);
      const p = path.getPointAtLength(Math.max(0.01, len));
      dot.style.transform = `translate(${p.x}px, ${p.y}px)`;
      dot.style.opacity = len > 2 && len < L - 2 ? "1" : len >= L - 2 ? "0" : "0";
      let n = -1;
      geo.stops.forEach((s, i) => { if (tip >= s.y) n = i; });
      if (n !== last) { last = n; setLit(n); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [geo, reducedMotion]);

  // Cards rise into place, a few at a time
  useEffect(() => {
    if (phase !== "entered" || reducedMotion) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("#work ul > li, #motion ul > li, #documents .mt-14, #about ul > li"));
    cards.forEach((c) => c.classList.add("jr-card"));
    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((e) => e.isIntersecting);
        shown.forEach((e, i) => {
          const el = e.target as HTMLElement;
          el.style.transitionDelay = `${i * 90}ms`;
          el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    cards.forEach((c) => io.observe(c));
    return () => {
      io.disconnect();
      cards.forEach((c) => c.classList.remove("jr-card", "is-in"));
    };
  }, [phase, reducedMotion]);

  if (!geo) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[30] w-full" style={{ height: geo.h }}>
      <svg ref={svgRef} className="absolute left-0 top-0 overflow-visible" width={geo.w} height={geo.h}>
        <defs>
          <linearGradient id="jr-grad" x1="0" y1="0" x2="0" y2={geo.h} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffd166" />
            <stop offset="0.5" stopColor="#2bb8ff" />
            <stop offset="1" stopColor="#ffd166" />
          </linearGradient>
        </defs>
        <path d={geo.d} fill="none" stroke="rgb(201 214 242 / 0.18)" strokeWidth={geo.compact ? 1.5 : 2} strokeDasharray="2 9" strokeLinecap="round" />
        <path ref={drawRef} d={geo.d} fill="none" stroke="url(#jr-grad)" strokeWidth={geo.compact ? 2.5 : 3} strokeLinecap="round" className="jr-line" />
      </svg>

      {geo.stops.map((s, i) => (
        <div key={s.id} className={`jr-stop ${geo.compact ? "is-compact" : ""} ${i <= lit ? "is-on" : ""}`} style={{ left: geo.x, top: s.y }}>
          <span className="jr-pin">
            <svg viewBox="0 0 24 24"><path d={ICONS[s.icon]} /></svg>
          </span>
          {!geo.compact && (
            <span className="jr-flag">
              <b>{String(i + 1).padStart(2, "0")}</b> {t(s.label, s.labelTr)}
            </span>
          )}
        </div>
      ))}

      <div ref={dotRef} className={`jr-dot ${geo.compact ? "is-compact" : ""}`} />
    </div>
  );
}
