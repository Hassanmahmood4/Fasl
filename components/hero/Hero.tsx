import { ArrowDown } from "lucide-react";
import { HeroNav } from "./HeroNav";
import { HeroStack, HeroWheat } from "./HeroWheat";
import { WheatField } from "./WheatField";

const HINT_ID = "hero-hint";
const NAV_ID = "hero-nav";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative h-svh min-h-[560px] overflow-hidden bg-white"
    >
      {/* Real text under the canvas, for screen readers and search engines. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-gutter pt-20 pb-14 text-center motion-reduce:justify-start motion-reduce:pt-20 motion-reduce:pb-0">
        <p className="flex items-baseline gap-3 text-black">
          <span
            lang="ur"
            dir="rtl"
            className="font-urdu text-urdu"
          >
            فصل
          </span>
        </p>
        <h1
          className="mt-2 max-w-[16ch] font-display text-hero font-black text-black"
        >
          Know if your crop is ready, from one photo.
        </h1>
        <p className="mt-6 max-w-[58ch] text-lead text-charcoal">
          Snap your field. Fasl tells you the crop, its growth stage, whether
          it&rsquo;s ready to harvest, and if anything is wrong.
        </p>
      </div>

      <HeroWheat />
      <HeroStack />

      <WheatField hintId={HINT_ID} navId={NAV_ID} />

      <HeroNav id={NAV_ID} />

      <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center px-4 sm:bottom-7">
        <p
          id={HINT_ID}
          className="flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-caption text-white motion-reduce:hidden"
        >
          Scroll to open the field
          <ArrowDown aria-hidden="true" className="size-3.5" />
        </p>
      </div>
    </section>
  );
}
