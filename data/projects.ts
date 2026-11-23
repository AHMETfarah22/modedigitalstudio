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

export const CATEGORIES_TR: Record<Category, string> = {
  web: "Web Geliştirme",
  software: "Yazılım ve Uygulamalar",
  uiux: "UI/UX Tasarım",
  creative: "Kreatif Tasarım",
  animation: "2D ve 3D Animasyon",
  motion: "Hareketli Grafik",
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
  /** Turkish summary and highlights. */
  summaryTr?: string;
  highlightsTr?: string[];
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
    summaryTr:
      "Bir süreç danışmanı için karanlık, sesle ilerleyen bir 3D dünya. Ziyaretçi sesli ya da sessiz girmeyi seçer, sonra kaostan düzene giden bir sahnede ilerler.",
    highlightsTr: ["3D sahne", "Ses tasarımı", "İtalyanca ve İngilizce"],
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
    summaryTr:
      "Kurucusunun Somali'den Türkiye'ye uzanan yolunu harita üzerinde anlatan bir yazılımcı sitesi. Ziyaretçi ne yaptırmak istediğini yazar ve projeyi hemen başlatır.",
    highlightsTr: ["Etkileşimli harita", "Üç dil", "Proje formu"],
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
    summaryTr:
      "Mode Academy öğrencilerinin TEKNOFEST ve TÜBİTAK projelerine hazırlandığı yer: 20 modüllük yol, takım panosu ve mentor görüşmeleri bir arada.",
    highlightsTr: ["Öğrenme platformu", "Takım panosu", "Mentor görüşmeleri"],
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
    summaryTr:
      "Denizden ilham alan niş bir parfüm evi için 3D ürün sitesi. Ziyaretçi dört kokudan birini seçer, üst, orta ve alt notaların tende saatler içindeki değişimini izler ve şişeyi sepete ekler.",
    highlightsTr: ["3D şişe", "Dört koku", "Nota zaman çizelgesi"],
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
    summaryTr:
      "Ziyaretçinin pizza, burger ya da dürüm seçip kendisinin hazırladığı bir sipariş sitesi: pizzaya malzeme, burgere kat, dürüme iç.",
    highlightsTr: ["3D paketleme", "Kendi siparişini hazırla", "Üç menü"],
    liveUrl: "https://hydro567.github.io/hydro-pizza/",
    featured: true,
  },
  {
    slug: "roneli",
    name: "Roneli",
    category: "web",
    cover: "/sites/loops/roneli.webp",
    loop: "/sites/loops/roneli.mp4",
    summary:
      "A site for a made-to-measure tailor. As visitors scroll, a suit is built piece by piece on a figure in the dark; the visit ends with the collection, common questions and a fitting appointment form.",
    highlights: ["Scroll-built suit", "Collection", "Fitting appointment"],
    summaryTr:
      "Ölçüye özel çalışan bir terzi için site. Ziyaretçi kaydırdıkça karanlıkta bir figürün üzerinde takım parça parça oluşur; ziyaret koleksiyon, sık sorulan sorular ve prova randevu formuyla biter.",
    highlightsTr: ["Kaydırdıkça oluşan takım", "Koleksiyon", "Prova randevusu"],
    liveUrl: "https://roneli.vercel.app/",
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
    summaryTr:
      "Sinematik bir berber sitesi: çapraz kayan şeritler, açık mı kapalı mı gösteren canlı saat, damgalanan fiyat listesi, berber kartları, fotoğraf duvarı ve dört adımlı randevu.",
    highlightsTr: ["Damgalı fiyat listesi", "Berber kartları", "Randevu adımları"],
    demoUrl: "/demos/barbershop/index.html",
  },
  {
    slug: "concept-croissant",
    name: "Katman",
    category: "web" as const,
    cover: "/sites/loops/concept-croissant.webp",
    loop: "/sites/loops/concept-croissant.mp4",
    summary:
      "A bakery site told by one croissant. As visitors scroll it opens, takes two scoops of ice cream and hot chocolate, closes, meets the knife and breaks in half on the plate.",
    highlights: ["Scroll-driven story", "Six scenes", "Menu and order"],
    summaryTr:
      "Tek bir kruvasanla anlatılan bir fırın sitesi. Ziyaretçi kaydırdıkça kruvasan açılır, iki top dondurma ve sıcak çikolata alır, kapanır, bıçakla buluşur ve tabakta ikiye ayrılır.",
    highlightsTr: ["Kaydırmayla ilerleyen hikâye", "Altı sahne", "Menü ve sipariş"],
    demoUrl: "/demos/croissant/index.html",
  },
].map((p) => ({ ...p, cover: asset(p.cover), loop: asset(p.loop), demoUrl: asset(p.demoUrl) }));

export const hostOf = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const logoTile = (p: Project) => (p.logoOnDark ? "bg-[#1a1a1a]" : "bg-ink");
