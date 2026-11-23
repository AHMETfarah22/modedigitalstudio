"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLang } from "@/lib/i18n";

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

/**
 * Section headings rise line by line from a mask, once, as they enter the viewport.
 * Text stays visible without JavaScript and under reduced motion.
 */
export default function Reveal({
  as: Tag = "h2",
  children,
  className = "",
  id,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { lang } = useLang();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let split: SplitText | undefined;
      let alive = true;
      document.fonts.ready.then(() => {
        if (!alive || !ref.current) return;
        split = new SplitText(el, { type: "lines", mask: "lines" });
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.09,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      return () => {
        alive = false;
        split?.revert();
      };
    },
    { scope: ref, dependencies: [lang], revertOnUpdate: true },
  );

  return (
    <Tag key={lang} ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
