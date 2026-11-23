"use client";

import { useEffect, useRef } from "react";

/**
 * Full-screen viewer on top of the native <dialog>: focus is trapped, Esc closes,
 * focus returns to the opener. Used for project details, video and PDF.
 */
export default function Viewer({
  open,
  onClose,
  label,
  children,
  tone = "dark",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  tone?: "dark" | "black";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add("is-locked");
      window.__lenis?.stop();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClosed = () => {
      document.documentElement.classList.remove("is-locked");
      window.__lenis?.start();
      onClose();
    };
    d.addEventListener("close", onClosed);
    return () => d.removeEventListener("close", onClosed);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={`viewer m-0 h-[100dvh] max-h-none w-screen max-w-none p-0 text-ink ${tone === "black" ? "bg-black" : "bg-night/95"}`}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      {open && (
        <div className="relative flex h-full flex-col">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="absolute right-4 top-4 z-10 grid size-12 place-items-center rounded-full bg-ink/10 backdrop-blur transition-colors hover:bg-ink/20 md:right-8 md:top-6"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
