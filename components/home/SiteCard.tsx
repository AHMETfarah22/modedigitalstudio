"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORIES_TR, hostOf, type Category, type Project } from "@/data/projects";
import { useLang } from "@/lib/i18n";

/**
 * Project card: a framed preview that plays a short muted loop of the real site
 * while it is on screen. Category pill top left, arrow to the live site top right,
 * name and address underneath. The frame opens the project details.
 */

const ICONS: Record<Category, React.ReactNode> = {
  web: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 9h18M6.5 6.8h.01M9 6.8h.01" />
    </>
  ),
  software: <path d="M8.5 8 4.5 12l4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13" />,
  uiux: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17M9.5 9v11" />
    </>
  ),
  creative: <path d="M4 20l4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5 16l-1 4zM14 7l3 3" />,
  animation: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </>
  ),
  motion: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />,
};

function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

export default function SiteCard({
  project: p,
  onOpen,
  priority = false,
}: {
  project: Project;
  onOpen: () => void;
  priority?: boolean;
}) {
  const [frameRef, inView] = useInView<HTMLDivElement>();
  const { t, lang } = useLang();
  const video = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false); // src attached once the card comes near
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!p.loop) return;
    if (inView) setArmed(true);
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (inView && !reduce) v.play().catch(() => {});
    else v.pause();
  }, [inView, armed, p.loop]);

  const arrowHref = p.liveUrl ?? p.demoUrl ?? p.moreUrl;

  return (
    <article className="kcard group">
      <div ref={frameRef} className="kcard-frame">
        {/* soft colour glow behind the frame on hover */}
        <img aria-hidden src={p.cover} alt="" className="kcard-glow" loading="lazy" />

        <button type="button" onClick={onOpen} className="kcard-hit" aria-label={t(`View ${p.name}`, `${p.name} projesini incele`)} data-cursor={t("View", "İncele")}>
          <img
            src={p.cover}
            alt=""
            loading={priority ? "eager" : "lazy"}
            className="kcard-media"
            draggable={false}
          />
          {p.loop && (
            <video
              ref={video}
              src={armed ? p.loop : undefined}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
              data-playing={playing}
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              className="kcard-media kcard-video"
            />
          )}
        </button>

        <span className="kcard-tag">
          <svg viewBox="0 0 24 24" aria-hidden>
            {ICONS[p.category]}
          </svg>
          {(lang === "tr" ? CATEGORIES_TR : CATEGORIES)[p.category]}
        </span>

        {arrowHref && (
          <a
            href={arrowHref}
            target="_blank"
            rel="noopener"
            className="kcard-go"
            aria-label={p.liveUrl ? t(`Open ${p.name} live website`, `${p.name} canlı sitesini aç`) : p.demoUrl ? t(`Open the ${p.name} concept site`, `${p.name} konsept sitesini aç`) : t(`See ${p.name} in the showcase`, `${p.name} projesini vitrinde gör`)}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="flex min-w-0 items-baseline gap-2.5">
          <button type="button" onClick={onOpen} className="truncate font-display text-lg font-bold leading-tight hover:text-ring">
            {p.name}
          </button>
          <span className="truncate text-sm text-mute/80">
            {p.liveUrl ? hostOf(p.liveUrl).replace(/\/.*$/, "") : p.demoUrl ? t("Concept site", "Konsept site") : p.author ? t(`by ${p.author}`, p.author) : ""}
          </span>
        </h3>
        {p.liveUrl && (
          <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink/80">
            <span className="size-1.5 rounded-full bg-[#3ddc84]" aria-hidden />
            {t("Live", "Yayında")}
          </span>
        )}
        {p.demoUrl && (
          <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink/80">
            <span className="size-1.5 rounded-full bg-sun" aria-hidden />
            {t("Concept", "Konsept")}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-[0.95rem] text-mute">{(lang === "tr" && p.summaryTr) || p.summary}</p>
    </article>
  );
}
