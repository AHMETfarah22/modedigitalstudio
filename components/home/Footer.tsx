"use client";

import { NAV, STUDIO } from "@/data/studio";
import { Mark } from "./Header";
import Welcome from "./Welcome";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer id="contact" className="relative overflow-hidden bg-navy">
      <div aria-hidden className="glow-ring pointer-events-none absolute left-1/2 top-0 size-[90vw] -translate-x-1/2 -translate-y-1/2" />
      <div className="wrap relative pb-10 pt-[clamp(5rem,9vw,8rem)]">
        <Welcome />

        <div className="relative z-[1] grid gap-10 border-t border-line pt-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex items-start gap-3">
            <Mark className="h-10 w-auto text-ink" />
            <div>
              <p className="font-display font-bold">Mode Digital Studio</p>
              <p className="mt-1 text-sm text-mute">
                {t("Part of ", "")}
                <a href={STUDIO.parent.url} target="_blank" rel="noopener" className="link-draw text-ink">
                  Mode Academy
                </a>
                {t(". ", " bünyesindedir. ")}
                {STUDIO.cities.join(t(" and ", " ve "))}.
              </p>
            </div>
          </div>
          <nav aria-label={t("Footer", "Alt menü")}>
            <ul className="grid grid-cols-2 gap-x-6">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="link-draw inline-flex min-h-11 items-center text-mute hover:text-ink">
                    {t(n.label, n.labelTr)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ul>
            <li>
              <a href={STUDIO.parent.url} target="_blank" rel="noopener" className="link-draw inline-flex min-h-11 items-center text-mute hover:text-ink">
                modeacademy.tr
              </a>
            </li>
          </ul>
        </div>
        <p className="mt-10 text-sm text-mute/80">© {new Date().getFullYear()} Mode Digital Studio</p>
      </div>
      <p aria-hidden className="pointer-events-none select-none text-center font-display text-[26vw] font-extrabold leading-[0.75] tracking-[-0.06em] text-ink/[0.04]">
        MODE
      </p>
    </footer>
  );
}
