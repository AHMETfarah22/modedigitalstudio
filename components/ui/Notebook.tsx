"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * A spiral-bound notebook you leaf through by hand.
 * Pages only turn when the visitor asks: buttons, page corners, ← → keys or a swipe.
 * Nothing turns on its own.
 *
 * Wide screens show a two-page spread; narrow screens show one page at a time.
 * Model: a stack of leaves. Leaf k carries pages[k*per] on its front and pages[k*per+1]
 * on its back (spread mode). `turned` leaves lie on the left.
 */

export type NotebookPage = {
  key: string;
  /** `active` is true while the page is open in front of the reader. */
  render: (active: boolean) => React.ReactNode;
};

const TURN_MS = 900;

function useSpread(minWidth: number) {
  const [spread, setSpread] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const on = () => setSpread(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [minWidth]);
  return spread;
}

export default function Notebook({
  pages,
  pageAspect,
  label,
  chapters,
  maxHeight = "78vh",
  spreadFrom = 900,
  paper = "plain",
}: {
  pages: NotebookPage[];
  /** Width / height of a single page. */
  pageAspect: number;
  label: string;
  chapters?: { label: string; page: number }[];
  /** Largest height the book may take, as a CSS length. */
  maxHeight?: string;
  spreadFrom?: number;
  paper?: "plain" | "dots";
}) {
  const spread = useSpread(spreadFrom);
  const per = spread ? 2 : 1;
  const n = pages.length;
  const leaves = Math.ceil(n / per);
  const maxTurn = spread ? leaves : n - 1;

  const [turned, setTurned] = useState(0);
  const { t } = useLang();
  const [turning, setTurning] = useState<number | null>(null);
  const timer = useRef<number>(0);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Keep the same page in view when switching between spread and single mode.
  const firstVisible = spread ? Math.max(0, turned * 2 - 1) : turned;
  const prevSpread = useRef(spread);
  useEffect(() => {
    if (prevSpread.current === spread) return;
    const page = prevSpread.current ? Math.max(0, turned * 2 - 1) : turned;
    prevSpread.current = spread;
    setTurned(spread ? Math.ceil(page / 2) : page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  const go = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(maxTurn, to));
      if (target === turned) return;
      setTurning(target > turned ? turned : target);
      setTurned(target);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setTurning(null), reduce.current ? 0 : TURN_MS);
    },
    [turned, maxTurn],
  );

  const next = () => go(turned + 1);
  const prev = () => go(turned - 1);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const visible = spread ? [turned * 2 - 1, turned * 2] : [turned];
  const isVisible = (p: number) => visible.includes(p);
  const near = (p: number) => p >= visible[0] - 2 && p <= visible[visible.length - 1] + 2;

  const counter = spread
    ? turned === 0
      ? t("Cover", "Kapak")
      : t(visible.filter((p) => p >= 0 && p < n).map((p) => p + 1).join("–") + ` of ${n}`, `${n} sayfadan ` + visible.filter((p) => p >= 0 && p < n).map((p) => p + 1).join("–"))
    : t(`${turned + 1} of ${n}`, `${n} sayfadan ${turned + 1}`);

  const activeChapter = chapters ? [...chapters].reverse().find((c) => c.page <= Math.max(0, firstVisible + (spread && turned > 0 ? 1 : 0))) : undefined;

  const bookAspect = pageAspect * per;

  const renderPage = (p: number, side: "left" | "right" | "single") => {
    if (p < 0 || p >= n) return <div className={`nb-page nb-${side} nb-blank`} />;
    return (
      <div className={`nb-page nb-${side} ${paper === "dots" ? "nb-dots" : ""}`}>
        {near(p) ? pages[p].render(isVisible(p) && turning === null) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {chapters && chapters.length > 0 && (
        <div role="group" aria-label={t("Chapters", "Bölümler")} className="flex flex-wrap justify-center gap-2">
          {chapters.map((c) => (
            <button
              key={c.label}
              type="button"
              className="chip"
              aria-pressed={activeChapter?.label === c.label}
              onClick={() => go(spread ? Math.ceil(c.page / 2) : c.page)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div
        role="region"
        aria-roledescription="notebook"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") pointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = pointer.current;
          pointer.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) (dx < 0 ? next : prev)();
        }}
        className="nb-book relative w-full rounded-[18px] outline-offset-8"
        style={{ width: `min(100%, calc(${maxHeight} * ${bookAspect}))`, aspectRatio: `${bookAspect}` }}
      >
        {/* Cover board behind the paper */}
        <div aria-hidden className="nb-board" />

        {/* Pages that are already turned, plus the right-hand stack */}
        <div className="absolute inset-0 [perspective:2400px]">
          {Array.from({ length: leaves }, (_, k) => {
            const isTurned = k < turned;
            const z = turning === k ? leaves * 3 : isTurned ? k + 1 : leaves * 2 - k;
            const front = k * per;
            const back = spread ? k * per + 1 : -1;
            // Leaves far from the open spread are not rendered at all.
            const keep = Math.abs(k - turned) <= 2 || turning === k;
            if (!keep) return null;
            return (
              <div
                key={k}
                className="nb-leaf"
                data-turned={isTurned ? "1" : undefined}
                data-gone={!spread && isTurned && turning !== k ? "1" : undefined}
                inert={!(visible.includes(front) || visible.includes(back))}
                style={{
                  left: spread ? "50%" : "0%",
                  width: spread ? "50%" : "100%",
                  zIndex: z,
                }}
              >
                <div className="nb-face nb-front">{renderPage(front, spread ? "right" : "single")}</div>
                <div className="nb-face nb-back">{spread ? renderPage(back, "left") : <div className="nb-page nb-single nb-blank" />}</div>
              </div>
            );
          })}
        </div>

        {/* Spiral binding */}
        <div aria-hidden className={`nb-spiral ${spread ? "left-1/2 -translate-x-1/2" : "left-0 -translate-x-1/2"}`}>
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} />
          ))}
        </div>

        {/* Page corners: click to turn */}
        {turned < maxTurn && (
          <button type="button" tabIndex={-1} aria-hidden onClick={next} className="nb-corner nb-corner-next" data-cursor={t("Next", "İleri")} />
        )}
        {turned > 0 && (
          <button type="button" tabIndex={-1} aria-hidden onClick={prev} className="nb-corner nb-corner-prev" data-cursor={t("Back", "Geri")} style={spread ? undefined : { display: "none" }} />
        )}
      </div>

      <div className="flex w-full max-w-md items-center justify-between gap-4">
        <button type="button" onClick={prev} disabled={turned === 0} className="btn btn-line btn-sm disabled:opacity-35" aria-label={t("Previous page", "Önceki sayfa")}>
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          {t("Back", "Geri")}
        </button>
        <p className="text-sm tabular-nums text-mute" aria-live="polite">
          {counter}
        </p>
        <button type="button" onClick={next} disabled={turned >= maxTurn} className="btn btn-line btn-sm disabled:opacity-35" aria-label={t("Next page", "Sonraki sayfa")}>
          {t("Next", "İleri")}
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
