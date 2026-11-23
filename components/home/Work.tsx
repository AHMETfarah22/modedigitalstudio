"use client";

import { useCallback, useState } from "react";
import { CATEGORIES, CONCEPTS, FEATURED, hostOf, type Project } from "@/data/projects";
import Reveal from "@/components/ui/Reveal";
import Viewer from "@/components/ui/Viewer";
import SiteCard from "./SiteCard";



export default function Work() {
  const [active, setActive] = useState<Project | null>(null);
  const close = useCallback(() => setActive(null), []);

  return (
    <section id="work" aria-labelledby="work-title" className="relative py-[clamp(6rem,12vw,10rem)]">
      <div className="wrap">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal id="work-title" className="max-w-[16ch] text-[clamp(2.2rem,5.4vw,4.75rem)] font-bold">
            Websites we have put live.
          </Reveal>
          <p className="max-w-[26rem] text-mute">
            Sites built by the studio and online today. Open one to read how it works, or visit it.
          </p>
        </div>

        {/* Two wide cards, then rows of three */}
        <ul className="mt-14 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURED.map((p, i) => (
            <li key={p.slug} className={FEATURED.length % 3 === 2 && i < 2 ? "lg:col-span-3" : "lg:col-span-2"}>
              <SiteCard project={p} onOpen={() => setActive(p)} priority={i < 2} />
            </li>
          ))}
        </ul>

        {/* Concept sites made by the studio as samples */}
        <div className="mt-[clamp(6rem,10vw,9rem)] grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal as="h2" id="concepts-title" className="max-w-[18ch] text-[clamp(2rem,4.6vw,4rem)] font-bold">
            Concept sites for local businesses.
          </Reveal>
          <p className="max-w-[26rem] text-mute">
            Samples the studio built to show what an interactive site can do for a shop. Open one and try it.
          </p>
        </div>
        <ul aria-labelledby="concepts-title" className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-6">
          {CONCEPTS.map((p) => (
            <li key={p.slug} className="lg:col-span-3">
              <SiteCard project={p} onOpen={() => setActive(p)} />
            </li>
          ))}
        </ul>
      </div>

      <Viewer open={!!active} onClose={close} label={active ? `${active.name} details` : "Project details"}>
        {active && <ProjectDetail project={active} />}
      </Viewer>
    </section>
  );
}

function ProjectDetail({ project: p }: { project: Project }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain" data-lenis-prevent>
      <div className="wrap grid gap-10 py-20 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-[24px] border border-line">
            {p.loop ? (
              <video src={p.loop} poster={p.cover} autoPlay muted loop playsInline aria-label={`${p.name}, a short tour of the site`} className="w-full" />
            ) : (
              <img src={p.cover} alt={`${p.name}, main screen`} className="w-full object-cover" />
            )}
          </div>
        </div>
        <div className="lg:col-span-5">
          <p className="text-sm text-mute">{CATEGORIES[p.category]}</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-bold">{p.name}</h2>
          {p.author && <p className="mt-2 text-mute">Made by {p.author}, Mode Academy student</p>}
          <p className="mt-6 text-lg leading-relaxed">{p.summary}</p>

          <dl className="mt-8 grid gap-6 border-t border-line pt-6">
            <div>
              <dt className="text-sm text-mute">Inside the project</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {p.highlights.map((h) => (
                  <span key={h} className="tag">
                    {h}
                  </span>
                ))}
              </dd>
            </div>
            {p.tech && p.tech.length > 0 && (
              <div>
                <dt className="text-sm text-mute">Built with</dt>
                <dd className="mt-2">{p.tech.join(", ")}</dd>
              </div>
            )}
            {p.liveUrl && (
              <div>
                <dt className="text-sm text-mute">Address</dt>
                <dd className="mt-2">{hostOf(p.liveUrl)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            {p.demoUrl && (
              <a href={p.demoUrl} target="_blank" rel="noopener" className="btn btn-sun">
                Open the concept site
              </a>
            )}
            {p.liveUrl && (
              <a href={p.liveUrl} target="_blank" rel="noopener" className="btn btn-sun">
                Visit live website
              </a>
            )}
            {p.moreUrl && (
              <a href={p.moreUrl} target="_blank" rel="noopener" className="btn btn-line">
                See it in the Mode Academy showcase
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
