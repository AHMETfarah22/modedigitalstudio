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
 * The intro plays once per browser tab. `?intro` in the URL forces it again.
 * Runs before paint so returning visitors never see a flash of the overlay.
 */
const introScript = `try{var q=location.search.indexOf('intro')>-1;if(!q&&sessionStorage.getItem('mds-intro')==='1'){document.documentElement.dataset.intro='seen'}}catch(e){}`;

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
