import { DashboardPreview } from "@/components/dashboard/DashboardPreview";
import { Footer } from "@/components/footer/Footer";
import { Hero } from "@/components/hero/Hero";
import { Performance } from "@/components/performance/Performance";
import { Problem } from "@/components/problem/Problem";

export default function Home() {
  return (
    <>
      {/* Outside the pinned hero, so "back to top" lands on the closed curtain. */}
      <div id="top" />
      <main>
        <Hero />
        <Problem />
        <DashboardPreview />
        <Performance />
      </main>
      <Footer />
    </>
  );
}
