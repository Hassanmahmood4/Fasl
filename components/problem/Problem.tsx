import { SectionHeader } from "@/components/shared/SectionHeader";
import { WheatEdge } from "@/components/shared/WheatEdge";
import { ScrollRise, ScrollWords } from "./ScrollMotion";
import { StalkStory } from "./StalkStory";

export function Problem() {
  return (
    <section
      id="problem"
      className="relative overflow-hidden border-b-2 border-wheat bg-white pt-section pb-[calc(var(--spacing-section)+7rem)] text-black"
    >
      <div className="page-width">
        <SectionHeader
          label="The problem"
          title={<ScrollWords text="Field teams guess. Crops pay the price." />}
          lead={
            <ScrollRise as="span" distance={48} className="block">
              Agricultural departments across Pakistan still judge harvest readiness and crop
              health by eye and experience alone, and one wrong call can cost a whole region&rsquo;s season.
            </ScrollRise>
          }
        />

        <StalkStory />

        <ScrollRise distance={72} className="mt-block">
          <p className="max-w-[22ch] font-display text-heading font-black md:mx-auto md:text-center">
            Fasl turns one photo into a clear answer.
          </p>
        </ScrollRise>
        {/* Without JavaScript nothing scrubs, so everything simply shows. */}
        <noscript>
          <style>{`[data-scroll-motion] { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </div>

      <WheatEdge placement="bottom" className="text-wheat" />
    </section>
  );
}
