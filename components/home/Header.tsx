"use client";

import { useEffect, useState } from "react";
import { NAV, STUDIO } from "@/data/studio";
import Magnetic from "@/components/ui/Magnetic";
import ModeLogo from "@/components/ui/ModeLogo";

/** The Mode Academy logo, in the current text colour. */
export function Mark({ className = "size-8" }: { className?: string }) {
  return <ModeLogo className={className} />;
}

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("is-locked", open);
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ${
        solid || open ? "border-b border-line bg-night/75 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="wrap flex h-[72px] items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-3" aria-label="Mode Digital Studio, back to top">
          <Mark className="h-9 w-auto text-ink" />
          <span className="whitespace-nowrap font-display text-[0.85rem] font-bold tracking-[0.04em] sm:text-[0.95rem]">
            DIGITAL STUDIO
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="link-draw py-2 text-[0.95rem] text-mute transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <Magnetic>
              <a href={STUDIO.whatsapp} target="_blank" rel="noopener" className="btn btn-sun btn-sm">
                Start a project
              </a>
            </Magnetic>
          </span>
          <button
            type="button"
            className="relative grid size-11 place-items-center rounded-full border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className={`absolute h-px w-5 bg-ink transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-1"}`} />
            <span className={`absolute h-px w-5 bg-ink transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-1"}`} />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100dvh-72px)] overflow-y-auto border-t border-line bg-night px-[clamp(20px,4vw,56px)] pb-10 pt-6 lg:hidden"
      >
        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-5 font-display text-3xl font-bold"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={STUDIO.whatsapp} target="_blank" rel="noopener" className="btn btn-sun mt-8 w-full">
          Start a project on WhatsApp
        </a>
      </div>
    </header>
  );
}
