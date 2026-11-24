"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CHAPTERS, VIDEOS, driveView, drivePreview, posterOf, type ChapterId, type VideoItem } from "@/data/media";
import Reveal from "@/components/ui/Reveal";
import Viewer from "@/components/ui/Viewer";
import { Mark } from "./Header";
import { useLang, type Lang } from "@/lib/i18n";

type Filter = "all" | ChapterId;
const FIRST = 9; // cards shown before "Show all"

/** Videos as framed cards, in the same family as the website cards. Click to watch full screen. */
export default function MotionGallery() {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const close = useCallback(() => setPlaying(null), []);
  const { t, lang } = useLang();

  const ordered = useMemo(() => CHAPTERS.flatMap((c) => VIDEOS.filter((v) => v.chapter === c.id)), []);
  const list = filter === "all" ? ordered : ordered.filter((v) => v.chapter === filter);
  const shown = filter === "all" && !expanded ? list.slice(0, FIRST) : list;
  const count = (f: Filter) => (f === "all" ? VIDEOS.length : VIDEOS.filter((v) => v.chapter === f).length);

  return (
    <section id="motion" aria-labelledby="motion-title" className="relative overflow-hidden bg-navy py-[clamp(6rem,12vw,10rem)]">
      <div aria-hidden className="glow-ring pointer-events-none absolute -right-[20%] -top-[30%] size-[70vw]" />
      <div className="wrap relative">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal id="motion-title" className="max-w-[16ch] text-[clamp(2.2rem,5.4vw,4.75rem)] font-bold">
            {t("Videos of our games, VR and motion work.", "Oyunlarımızın, VR ve hareketli grafik işlerimizin videoları.")}
          </Reveal>
          <p className="max-w-[26rem] text-mute">
            {t("Games, virtual reality, camps and motion graphics. Open any card to watch it full screen.", "Oyunlar, sanal gerçeklik, kamplar ve hareketli grafikler. İzlemek için herhangi bir kartı tam ekran açın.")}
          </p>
        </div>

        <div role="group" aria-label={t("Filter videos", "Videoları filtrele")} className="mt-10 flex flex-wrap gap-2">
          {(["all", ...CHAPTERS.map((c) => c.id)] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setExpanded(false);
              }}
            >
              {f === "all" ? t("All", "Tümü") : (() => { const c = CHAPTERS.find((c) => c.id === f); return c ? t(c.label, c.labelTr) : ""; })()}{" "}
              <span className="opacity-60">{count(f)}</span>
            </button>
          ))}
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v, i) => (
            <li key={`${v.drive ?? v.src}-${i}`}>
              <VideoCard video={v} onPlay={() => setPlaying(v)} lang={lang} />
            </li>
          ))}
        </ul>

        {filter === "all" && list.length > FIRST && (
          <div className="mt-12 flex justify-center">
            <button type="button" className="btn btn-line" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>
              {expanded ? t("Show fewer videos", "Daha az video göster") : t(`Show all ${list.length} videos`, `${list.length} videonun tümünü göster`)}
            </button>
          </div>
        )}
      </div>

      <Viewer open={!!playing} onClose={close} label={playing ? `${vt(playing, lang).title} video` : "Video"} tone="black">
        {playing && <Player video={playing} lang={lang} />}
      </Viewer>
    </section>
  );
}

const chapterLabel = (v: VideoItem, lang: Lang) => {
  const c = CHAPTERS.find((c) => c.id === v.chapter);
  return c ? (lang === "tr" ? c.labelTr : c.label) : "";
};
const vt = (v: VideoItem, lang: Lang) => ({
  title: (lang === "tr" && v.titleTr) || v.title,
  note: (lang === "tr" && v.noteTr) || v.note,
});

function VideoCard({ video: v, onPlay, lang }: { video: VideoItem; onPlay: () => void; lang: Lang }) {
  const tx = vt(v, lang);
  const poster = posterOf(v);
  const preview = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  // Local clips preview on hover, like the website loops. Drive videos show their poster.
  const start = () => {
    if (!v.src || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    preview.current?.play().catch(() => {});
  };
  const stop = () => {
    const el = preview.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  return (
    <article className="kcard" onPointerEnter={(e) => e.pointerType === "mouse" && start()} onPointerLeave={stop}>
      <div className="kcard-frame">
        {poster && <img aria-hidden src={poster} alt="" className="kcard-glow" loading="lazy" />}
        <button type="button" onClick={onPlay} className="kcard-hit" aria-label={lang === "tr" ? `${tx.title} oynat` : `Play ${tx.title}`} data-cursor={lang === "tr" ? "Oynat" : "Play"}>
          {poster ? (
            <img src={poster} alt="" loading="lazy" className="kcard-media" style={{ objectPosition: "center" }} draggable={false} />
          ) : (
            <span className="kcard-media grid place-items-center bg-[radial-gradient(80%_90%_at_80%_10%,#1f5cdc,#0a1733_70%)]">
              <Mark className="size-[18%] opacity-40" />
            </span>
          )}
          {v.src && (
            <video
              ref={preview}
              src={v.src}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
              data-playing={live}
              onPlaying={() => setLive(true)}
              onPause={() => setLive(false)}
              className="kcard-media kcard-video"
              style={{ objectPosition: "center" }}
            />
          )}
          <span className="kcard-play" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
        </button>

        <span className="kcard-tag">
          <svg viewBox="0 0 24 24" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M10 9.5v5l4.5-2.5z" />
          </svg>
          {chapterLabel(v, lang)}
        </span>

        {v.drive && (
          <a href={driveView(v.drive)} target="_blank" rel="noopener" className="kcard-go" aria-label={lang === "tr" ? `${tx.title} videosunu Google Drive'da aç` : `Open ${tx.title} in Google Drive`}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        )}
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 md:flex-nowrap">
        <h3 className="min-w-0 md:truncate">
          <button type="button" onClick={onPlay} className="text-left font-display md:truncate text-lg font-bold leading-tight hover:text-ring">
            {tx.title}
          </button>
        </h3>
        {tx.note && <span className="min-w-0 truncate text-sm text-mute/80">{tx.note}</span>}
      </div>
    </article>
  );
}

function Player({ video: v, lang }: { video: VideoItem; lang: Lang }) {
  const tx = vt(v, lang);
  const portrait = v.shape === "portrait";
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 pt-20 md:px-10">
        <div className={`relative overflow-hidden rounded-2xl bg-night ${portrait ? "aspect-[9/16] h-full max-w-full" : "aspect-video w-full max-w-[min(100%,calc((100dvh-220px)*16/9))]"}`}>
          {v.drive ? (
            <iframe
              src={drivePreview(v.drive)}
              title={tx.title}
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
            />
          ) : (
            <video src={v.src} poster={posterOf(v) ?? undefined} controls autoPlay playsInline className="absolute inset-0 size-full bg-black object-contain" />
          )}
        </div>
      </div>
      <div className="wrap flex flex-wrap items-end justify-between gap-4 border-t border-line py-5">
        <div className="min-w-0">
          <p className="text-sm text-mute">{chapterLabel(v, lang)}</p>
          <h2 className="mt-1 text-2xl font-bold">
            {tx.title}
            {tx.note && <span className="ml-3 text-base font-normal text-mute">{tx.note}</span>}
          </h2>
        </div>
        {v.drive && (
          <a href={driveView(v.drive)} target="_blank" rel="noopener" className="btn btn-line btn-sm">
            {lang === "tr" ? "Google Drive'da aç" : "Open in Google Drive"}
          </a>
        )}
      </div>
    </div>
  );
}
