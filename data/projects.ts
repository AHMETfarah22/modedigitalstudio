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

/** 3D concept sites built by the studio as samples (served from /public/demos). */
const RAW_CONCEPTS: Project[] = [
  {
    slug: "concept-cafe",
    name: "Telve Kahve",
    category: "web",
    cover: "/sites/loops/concept-cafe.webp",
    loop: "/sites/loops/concept-cafe.mp4",
    summary: "A specialty coffee house in 3D: a turning cup with latte art and steam, beans that swirl around it as you scroll, and the menu beside it.",
    highlights: ["3D cup and steam", "Scroll story", "Menu"],
    demoUrl: "/demos/cafe/index.html",
  },
  {
    slug: "concept-restaurant",
    name: "Sofra",
    category: "web",
    cover: "/sites/loops/concept-restaurant.webp",
    loop: "/sites/loops/concept-restaurant.mp4",
    summary: "An Anatolian restaurant: the dish assembles on the plate, the camera moves around a candle-lit table, and the evening ends at the reservation form.",
    highlights: ["3D table", "Menu tabs", "Reservation form"],
    demoUrl: "/demos/restaurant/index.html",
  },
  {
    slug: "concept-hospital",
    name: "Nabız Hastanesi",
    category: "web",
    cover: "/sites/loops/concept-hospital.webp",
    loop: "/sites/loops/concept-hospital.mp4",
    summary: "A private hospital site: a glass heart beating with a heartbeat line, a DNA helix for the departments, and online appointments.",
    highlights: ["3D heart and DNA", "Departments", "Appointment form"],
    demoUrl: "/demos/hospital/index.html",
  },
  {
    slug: "concept-hotel",
    name: "Liman Butik Otel",
    category: "web",
    cover: "/sites/loops/concept-hotel.webp",
    loop: "/sites/loops/concept-hotel.mp4",
    summary: "A boutique hotel on an Aegean bay: the water moves, the camera glides from the rooms to the pier, and the day turns to sunset as you scroll.",
    highlights: ["3D bay and water", "Day to sunset", "Booking form"],
    demoUrl: "/demos/hotel/index.html",
  },
  {
    slug: "concept-bakery",
    name: "Ekşi Maya Fırın",
    category: "web",
    cover: "/sites/loops/concept-bakery.webp",
    loop: "/sites/loops/concept-bakery.mp4",
    summary: "An artisan bakery: a sourdough loaf and simit in warm oven light, dough that rises with the scroll, and pre-orders for the morning.",
    highlights: ["3D bread", "Baking story", "Pre-order form"],
    demoUrl: "/demos/bakery/index.html",
  },
];

export const CONCEPTS: Project[] = RAW_CONCEPTS.map((p) => ({
  ...p,
  cover: asset(p.cover),
  loop: p.loop && asset(p.loop),
  demoUrl: p.demoUrl && asset(p.demoUrl),
}));

export const hostOf = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const logoTile = (p: Project) => (p.logoOnDark ? "bg-[#1a1a1a]" : "bg-ink");
