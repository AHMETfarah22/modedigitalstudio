import { SERVICES, STUDIO } from "@/data/studio";
import Reveal from "@/components/ui/Reveal";

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative overflow-hidden border-t border-line py-[clamp(6rem,12vw,10rem)]">
      <div className="wrap grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Reveal id="about-title" className="text-[clamp(2.4rem,6vw,5.4rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            IDEAS INTO DIGITAL REALITY.
          </Reveal>
          <div className="mt-10 max-w-[34rem] space-y-5 text-lg text-mute">
            <p>
              Mode Digital Studio is the official digital production studio of{" "}
              <a href={STUDIO.parent.url} target="_blank" rel="noopener" className="text-ink underline decoration-ring/60 underline-offset-4 hover:decoration-ring">
                Mode Academy
              </a>
              . We design and build websites, software, games, animation and the creative work around them.
            </p>
            <p>The team grew up inside the academy, next to students who ship their own games, apps and films.</p>
          </div>
          <p className="mt-10 text-sm text-mute">{STUDIO.cities.join(" and ")}</p>
        </div>

        <div className="lg:col-span-6">
          <h3 className="font-display text-lg font-bold">What we make</h3>
          <ul className="mt-6 border-t border-line">
            {SERVICES.map((s) => (
              <li key={s.title} className="group grid gap-2 border-b border-line py-6 sm:grid-cols-[1fr_1.3fr] sm:gap-6">
                <p className="font-display text-xl font-bold transition-colors group-hover:text-ring">{s.title}</p>
                <div>
                  <p className="text-mute">{s.text}</p>
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
