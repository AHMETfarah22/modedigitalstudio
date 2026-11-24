"use client";

import { useCallback, useMemo, useState } from "react";
import { BROCHURE } from "@/data/media";
import Reveal from "@/components/ui/Reveal";
import Viewer from "@/components/ui/Viewer";
import Notebook, { type NotebookPage } from "@/components/ui/Notebook";
import { useLang } from "@/lib/i18n";

/** Documents read as notebooks: the brochure is leafed through page by page, by hand. */
export default function Documents() {
  const [full, setFull] = useState(false);
  const close = useCallback(() => setFull(false), []);
  const doc = BROCHURE;
  const { t } = useLang();

  const pages: NotebookPage[] = useMemo(
    () =>
      doc.pages.map((src, i) => ({
        key: src,
        render: () => (
          <img
            src={src}
            alt={i === 0 ? t(`${doc.title}, cover`, `${doc.title}, kapak`) : t(`${doc.title}, page ${i + 1}`, `${doc.title}, sayfa ${i + 1}`)}
            loading={i < 3 ? "eager" : "lazy"}
            draggable={false}
            className="size-full select-none object-cover"
          />
        ),
      })),
    [doc, t],
  );

  return (
    <section id="documents" aria-labelledby="docs-title" className="py-[clamp(6rem,12vw,10rem)]">
      <div className="wrap">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal id="docs-title" className="max-w-[16ch] text-[clamp(2.2rem,5.4vw,4.75rem)] font-bold">
            {t("Presentations and project documents.", "Sunumlar ve proje belgeleri.")}
          </Reveal>
          <div className="max-w-[26rem]">
            <p className="text-mute">{t("Leaf through the Mode Academy brochure here, open it full screen, or download the PDF.", "Mode Academy tanıtım kitapçığını burada sayfa sayfa çevirin, tam ekran açın ya da PDF olarak indirin.")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setFull(true)} className="btn btn-line btn-sm">
                {t("Read full screen", "Tam ekran oku")}
              </button>
              <a href={doc.file} download className="btn btn-sun btn-sm">
                {t("Download PDF", "PDF indir")}, {doc.fileSize}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <Notebook pages={pages} pageAspect={doc.pageAspect} label={doc.title} maxHeight="min(78vh, 820px)" />
        </div>
      </div>

      <Viewer open={full} onClose={close} label={t(`${doc.title}, full screen`, `${doc.title}, tam ekran`)}>
        <div className="flex h-full flex-col items-center justify-center overflow-hidden px-4 pb-6 pt-20">
          <Notebook pages={pages} pageAspect={doc.pageAspect} label={t(`${doc.title}, full screen`, `${doc.title}, tam ekran`)} maxHeight="calc(100dvh - 190px)" />
        </div>
      </Viewer>
    </section>
  );
}
