import type { Metadata, Viewport } from "next";
import { Unbounded, Figtree } from "next/font/google";
import "./globals.css";
import { asset } from "@/lib/asset";

const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mode Digital Studio · Websites, software and animation by Mode Academy",
  description:
    "Mode Digital Studio is the digital production studio of Mode Academy. We build websites, software, games, 3D animation and motion graphics.",
  icons: { icon: asset("/mark.svg") },
  openGraph: {
    title: "Mode Digital Studio",
    description: "Websites, software and animation from the studio of Mode Academy.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050b1e",
  width: "device-width",
  initialScale: 1,
};

/**
 * The welcome intro plays on every page load, reloads included, and the page always starts at the top.
 * `?nointro` in the URL skips it (handy for links straight to a section).
 */
const introScript = `try{history.scrollRestoration='manual';if(location.search.indexOf('nointro')>-1){document.documentElement.dataset.intro='seen'}else{window.scrollTo(0,0)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
