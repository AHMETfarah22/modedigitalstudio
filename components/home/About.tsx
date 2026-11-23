"use client";

import { SERVICES, STUDIO } from "@/data/studio";
import Reveal from "@/components/ui/Reveal";
import { useLang } from "@/lib/i18n";

export default function About() {
  const { t } = useLang();
  return (
    <section id="about" aria-labelledby="about-title" className="relative overflow-hidden border-t border-line py-[clamp(6rem,12vw,10rem)]">
      <div className="wrap grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Reveal id="about-title" className="text-[clamp(2.4rem,6vw,5.4rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            {t("IDEAS INTO DIGITAL REALITY.", "FİKİRLERDEN DİJİTAL GERÇEKLİĞE.")}
          </Reveal>
          <div className="mt-10 max-w-[34rem] space-y-5 text-lg text-mute">
            <p>
              {t("Mode Digital Studio is the official digital production studio of ", "Mode Digital Studio, ")}
              <a href={STUDIO.parent.url} target="_blank" rel="noopener" className="text-ink underline decoration-ring/60 underline-offset-4 hover:decoration-ring">
                Mode Academy
              </a>
              {t(
                ". We design and build websites, software, games, animation and the creative work around them.",
                "'nin resmi dijital üretim stüdyosudur. Web siteleri, yazılım, oyun, animasyon ve bunların etrafındaki yaratıcı işleri tasarlayıp geliştiriyoruz.",
              )}
            </p>
            <p>
              {t(
                "The team grew up inside the academy, next to students who ship their own games, apps and films.",
                "Ekip, kendi oyunlarını, uygulamalarını ve filmlerini yayına çıkaran öğrencilerle birlikte akademinin içinde büyüdü.",
              )}
            </p>
          </div>
          <p className="mt-10 text-sm text-mute">{STUDIO.cities.join(t(" and ", " ve "))}</p>
        </div>

        <div className="lg:col-span-6">
          <h3 className="font-display text-lg font-bold">{t("What we make", "Neler yapıyoruz")}</h3>
          <ul className="mt-6 border-t border-line">
            {SERVICES.map((s) => (
              <li key={s.title} className="group grid gap-2 border-b border-line py-6 sm:grid-cols-[1fr_1.3fr] sm:gap-6">
                <p className="font-display text-xl font-bold transition-colors group-hover:text-ring">{t(s.title, s.titleTr)}</p>
                <div>
                  <p className="text-mute">{t(s.text, s.textTr)}</p>
                  <p className="mt-2 text-sm text-ink/70">{s.tools.join(", ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
