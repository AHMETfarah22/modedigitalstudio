import { ExperienceProvider } from "@/lib/experience";
import { LangProvider } from "@/lib/i18n";
import Intro from "@/components/intro/Intro";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import Work from "@/components/home/Work";
import MotionGallery from "@/components/home/MotionGallery";
import Documents from "@/components/home/Documents";
import About from "@/components/home/About";
import Footer from "@/components/home/Footer";
import Cursor from "@/components/ui/Cursor";
import SmoothScroll from "@/components/ui/SmoothScroll";
import ScrollJourney from "@/components/ui/ScrollJourney";

export default function Home() {
  return (
    <LangProvider>
    <ExperienceProvider>
      <a
        href="#work"
        className="fixed left-4 top-4 z-[80] -translate-y-24 rounded-full bg-sun px-5 py-3 font-semibold text-night focus:translate-y-0"
      >
        Skip to content
      </a>
      <Intro />
      <Header />
      <main className="relative z-[1]">
        <Hero />
        <Work />
        <MotionGallery />
        <Documents />
        <About />
      </main>
      <Footer />
      <ScrollJourney />
      <Cursor />
      <SmoothScroll />
    </ExperienceProvider>
    </LangProvider>
  );
}
