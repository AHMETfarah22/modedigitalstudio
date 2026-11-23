import { asset } from "@/lib/asset";

/**
 * Every project on the site lives here. All entries are real work, taken from the
 * previous Mode Digital Studio site and the Mode Academy showcase (modeacademy.tr/showcase).
 *
 * To add a project: drop its cover into /public/work (WebP, ~1280px wide) and add an entry.
 * Categories with no entries are hidden from the filter automatically.
 */

export type Category =
  | "web"
  | "software"
  | "uiux"
  | "creative"
  | "animation"
  | "motion";

export const CATEGORIES: Record<Category, string> = {
  web: "Web Development",
  software: "Software & Applications",
  uiux: "UI/UX Design",
  creative: "Creative Design",
  animation: "2D & 3D Animation",
  motion: "Motion Graphics",
};

export type Project = {
  slug: string;
  name: string;
  category: Category;
  cover: string;
  /** Short muted loop recorded from the live site (MP4 in /public/sites/loops). */
  loop?: string;
  logo?: string;
  /** Light logos sit on a dark tile. */
  logoOnDark?: boolean;
  summary: string;
  /** What the project contains (features, formats). */
  highlights: string[];
  /** Technologies — fill in only when confirmed. */
  tech?: string[];
  /** Who made it. Studio work leaves this empty; student work names the student. */
  author?: string;
  /** Public website, when the project is live. */
  liveUrl?: string;
  /** Where the full project can be seen (e.g. the showcase entry). */
  moreUrl?: string;
  featured?: boolean;
  /** A concept site made by the studio as a sample, not client work. Opens the demo in /demos. */
  demoUrl?: string;
};

const RAW_PROJECTS: Project[] = [
  {
    slug: "lorenzo-lottici",
    name: "Lorenzo Lottici",
    category: "web",
    cover: "/sites/loops/lorenzo.webp",
    loop: "/sites/loops/lorenzo.mp4",
    logo: "/logos/lorenzo.svg",
    logoOnDark: true,
    summary:
      "A dark, sound-led 3D world for a process consultant. Visitors choose to enter with or without sound, then move through a scene that goes from chaos to order.",
    highlights: ["3D scene", "Sound design", "Italian and English"],
    liveUrl: "https://lorenzolottici.it/en",
    featured: true,
  },
  {
    slug: "afm-coding",
    name: "AFM Coding",
    category: "web",
    cover: "/sites/loops/afmcoding.webp",
    loop: "/sites/loops/afmcoding.mp4",
    logo: "/logos/afm.svg",
    summary:
      "A developer's site that follows the founder's road from Somalia to Turkey on a map. Visitors describe what they want to build and start a project on the spot.",
    highlights: ["Interactive map", "Three languages", "Project form"],
    liveUrl: "https://afmcoding.com/",
    featured: true,
  },
  {
    slug: "proje-ussu",
    name: "Proje Üssü",
    category: "web",
    cover: "/sites/loops/proje-ussu.webp",
    loop: "/sites/loops/proje-ussu.mp4",
    logo: "/logos/proje-ussu.png",
    summary:
      "Where Mode Academy students prepare their TEKNOFEST and TÜBİTAK projects: a 20-module path, a team board and mentor sessions in one place.",
    highlights: ["Learning platform", "Team board", "Mentor sessions"],
    liveUrl: "https://modeacademy.tr/proje-ussu",
    featured: true,
  },
  {
    slug: "hydro-parfum",
    name: "Hydro Parfüm",
    category: "web",
    cover: "/sites/loops/hydro-parfum.webp",
    loop: "/sites/loops/hydro-parfum.mp4",
    summary:
      "A 3D product site for a niche perfume house inspired by the sea. Visitors pick one of four scents, follow its top, heart and base notes over the hours on skin, and add the bottle to the cart.",
    highlights: ["3D bottle", "Four scents", "Notes timeline"],
    liveUrl: "https://hydro567.github.io/Hydro-parf-m-evi/",
    featured: true,
  },
  {
    slug: "hydro-pizza",
    name: "Hydro",
    category: "web",
    cover: "/sites/loops/hydro-pizza.webp",
    loop: "/sites/loops/hydro-pizza.mp4",
    summary:
      "A food-ordering site where visitors choose pizza, burger or wrap and build it themselves: toppings on the pizza, layers in the burger, the filling in the wrap.",
    highlights: ["3D packaging", "Build your own order", "Three menus"],
    liveUrl: "https://hydro567.github.io/hydro-pizza/",
    featured: true,
  },
];

export const PROJECTS: Project[] = RAW_PROJECTS.map((p) => ({
  ...p,
  cover: asset(p.cover),
  loop: p.loop && asset(p.loop),
  logo: p.logo && asset(p.logo),
}));

export const FEATURED = PROJECTS.filter((p) => p.featured);

/** Concept sites built by the studio as samples (served from /public/demos). */
export const CONCEPTS: Project[] = [
  {
    slug: "concept-barbershop",
    name: "Ustura Berber Kulübü",
    category: "web" as const,
    cover: "/sites/loops/concept-barbershop.webp",
    loop: "/sites/loops/concept-barbershop.mp4",
    summary:
      "A cinematic barbershop site: crossing ticker tapes, a live open-or-closed clock, a price list you stamp, a barber deck, a photo wall and a four-step booking.",
    highlights: ["Stamped price list", "Barber deck", "Booking steps"],
    demoUrl: "/demos/barbershop/index.html",
  },
].map((p) => ({ ...p, cover: asset(p.cover), loop: asset(p.loop), demoUrl: asset(p.demoUrl) }));

export const hostOf = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const logoTile = (p: Project) => (p.logoOnDark ? "bg-[#1a1a1a]" : "bg-ink");
