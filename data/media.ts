import { asset } from "@/lib/asset";

/**
 * Video notebook and document notebook.
 *
 * Videos are streamed from the studio's shared Google Drive folders (they must stay
 * "anyone with the link can view"). Posters are saved locally in /public/video/drive/<id>.webp.
 * A video whose first frame is black has `poster: false` and gets a typographic cover.
 *
 * Local videos (H.264 MP4 in /public/video) use `src` instead of `drive`.
 */

export type ChapterId = "games" | "vr" | "camps" | "motion";

export const CHAPTERS: { id: ChapterId; label: string }[] = [
  { id: "games", label: "Games" },
  { id: "vr", label: "Virtual reality" },
  { id: "camps", label: "Camps and game jams" },
  { id: "motion", label: "Motion and film" },
];

export type VideoItem = {
  title: string;
  chapter: ChapterId;
  /** Google Drive file id. */
  drive?: string;
  /** Local MP4 instead of Drive. */
  src?: string;
  /** Local poster path; defaults to /video/drive/<drive>.webp. `false` = typographic cover. */
  poster?: string | false;
  shape?: "landscape" | "portrait";
  note?: string;
};

export const VIDEOS: VideoItem[] = [
  // Games
  { chapter: "games", title: "Dedemin İcadları", drive: "109_K4L94N5VOh5MvbXZHLYvZc30X4090" },
  { chapter: "games", title: "İcad ve Keşifler", note: "Demo", drive: "1I4crsr_Gm-WJI-Y6H28mW9ixAUxc4dvO" },
  { chapter: "games", title: "Drawn Realms: Pages of the Lost", drive: "19vlfrbIeQ50j9U0C7Dpdn8dWrNT5FNe3" },
  { chapter: "games", title: "Kaşif Elifba: Gerçek Hazinenin Peşinde", note: "Values education", drive: "1i16lAz8PNJyAjQzZi0fr2ox3290h7Fs4", poster: false },
  { chapter: "games", title: "Mektep Elifba", drive: "1MuVMSdTlp-ASbzXH6e08ZQkpuM0bZBLR" },
  { chapter: "games", title: "Sıfır Atık", drive: "1VDmbaEX5ei5huIpWTyEyFMDo9Tg1B_j7" },
  { chapter: "games", title: "AFAD", note: "Ending", drive: "1V8qqy4HNBncRb_0FlmJaIpSd0odua0nn" },
  { chapter: "games", title: "Çanta: Saklanma", note: "PC", drive: "1CobwK-rXBqTdlOzJc5Qytkm7G8PLyOSu" },
  { chapter: "games", title: "Sınır Ötesi Afrin", drive: "1sMrFx4QovT46Sd0sn5zanhsCCExmHXoR", poster: false },
  { chapter: "games", title: "Voyager of the Universe", drive: "1llgYUOiLejWbgPFxbxnyVCUvAukcWvzN", poster: false },

  // Virtual reality
  { chapter: "vr", title: "Acil Durum Çantası Hazırlama Oyunu", note: "VR", drive: "1Mhwbje0GAyDI2CqHrAoXeJII-ltZx0X8" },
  { chapter: "vr", title: "Acil Durum Çantası", drive: "1zOCcHI5VRMipE8Voc0r6j7Fk8DcAcJes", poster: false },
  { chapter: "vr", title: "Dedem", note: "VR", drive: "1RhZ_kkOiWTnlVoVMuiWcyb7swZUpxa57" },
  { chapter: "vr", title: "Dedem", note: "Cinema trailer", drive: "1dkcT1Nn6_UpdqlFN1X_ZkokpQfpyS7z9" },
  { chapter: "vr", title: "Geri Dönüşüm", drive: "1qLRst_dUMIMVFIk5r8IwooKkbMUFv2dQ", poster: false },
  { chapter: "vr", title: "Gerçeği Çiz, Umudu Anlat", drive: "1aZHsOgyNAjlSOG7zxBgDrxJnnDYtZx6g", poster: false },
  { chapter: "vr", title: "El Usturlabı", note: "Peykhane", drive: "1U7JW6lYcWfpWuOM6lrXk1BFIHoxmt_eS" },

  // Camps and game jams
  { chapter: "camps", title: "Mode Academy Bilişim Kampı İstanbul", drive: "1zU2VlcMu_uNi5UQOyNEJ-D5AYUVIzhDj" },
  { chapter: "camps", title: "Peykhane 5. Kış Oyun Geliştirme Kampı", note: "Game presentations", drive: "1pakEhkhD65rnHlFofUAJ_9WwV5d8O4fg" },
  { chapter: "camps", title: "Peykhane: Bu Yaz Oyun Yaz", note: "100. Yılda Milli Oyun Hamlesi", drive: "1759dJEAH_f5AHEejTR7OVR1kqYEWRhH7" },
  { chapter: "camps", title: "Find Your Son", note: "Nice Games, 5th game camp", drive: "1nl2w_LhTJh0hc1MhZaZOVWUtODd94RNf" },
  { chapter: "camps", title: "Samsonit", note: "SteamTRUE, 5th game camp", drive: "1yQAycjt3J2TaufD8QxHitCrV3xxoS9Mi" },
  { chapter: "camps", title: "Zombie Carnage", note: "NoName, 5th game camp", drive: "1UVWW-9v57xCbwWFU0QvuPfjSXsp8fVCN" },

  // Motion and film
  { chapter: "motion", title: "Güvenli", note: "BTK", drive: "1WYpr6yXwR7gbBDTwAlFXV0CO3WraHS0P" },
  { chapter: "motion", title: "Untitled cinematic", drive: "1YjE8lPxEssRCyVfR4pkDJmd4fUgSR1n1" },
  { chapter: "motion", title: "Route story", note: "AFM Coding", src: asset("/video/route-afmcoding.mp4"), poster: "/video/route-afmcoding.webp", shape: "portrait" },
  { chapter: "motion", title: "Route story", note: "İstanbul cut", src: asset("/video/route-ahmed.mp4"), poster: "/video/route-ahmed.webp", shape: "portrait" },
];

export const posterOf = (v: VideoItem) =>
  v.poster === false ? null : asset(v.poster ?? (v.drive ? `/video/drive/${v.drive}.webp` : "")) || null;

export const driveView = (id: string) => `https://drive.google.com/file/d/${id}/view`;
export const drivePreview = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

/* ---------- Documents ---------- */

export type DocBook = {
  slug: string;
  title: string;
  kind: string;
  /** Page images in reading order. */
  pages: string[];
  pageAspect: number; // width / height
  file: string;
  fileSize: string;
};

export const BROCHURE: DocBook = {
  slug: "tanitim-kitapcigi",
  title: "Mode Academy Tanıtım Kitapçığı 2026–2027",
  kind: "Brochure",
  pages: Array.from({ length: 20 }, (_, i) => asset(`/docs/tanitim-kitapcigi/${String(i + 1).padStart(2, "0")}.webp`)),
  pageAspect: 1159 / 1638,
  file: asset("/docs/mode-academy-tanitim-kitapcigi.pdf"),
  fileSize: "28 MB",
};
