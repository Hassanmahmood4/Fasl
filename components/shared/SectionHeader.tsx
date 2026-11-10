import type { ReactNode } from "react";

type SectionHeaderProps = {
  label: string;
  title: ReactNode;
  lead: ReactNode;
  tone?: "light" | "dark";
  /** Sits beside the label, for status tags. */
  tag?: ReactNode;
  /** A smaller heading, for sections that should carry less weight. */
  small?: boolean;
  /** Takes the smaller heading on one line on laptops and up, so the section fits a screen. */
  fit?: boolean;
};

const TONES = {
  light: { label: "text-charcoal", title: "text-black", lead: "text-charcoal leading-[1.55]" },
  dark: { label: "text-wheat", title: "text-wheat", lead: "text-white leading-[1.65]" },
};

export function SectionHeader({ label, title, lead, tone = "light", tag, small = false, fit = false }: SectionHeaderProps) {
  const colours = TONES[tone];
  return (
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <p className={`text-label font-semibold uppercase ${colours.label}`}>{label}</p>
        {tag}
      </div>
      <h2
        className={`mt-4 max-w-[16ch] font-display font-black ${small ? "text-section-small" : "text-section"} ${fit ? "lg:mt-2 lg:max-w-none lg:text-section-small short:text-[2.5rem]" : ""} ${colours.title}`}
      >
        {title}
      </h2>
      <p
        className={`${small ? "mt-4" : "mt-6"} ${fit ? "lg:mt-2 short:text-body" : ""} max-w-[60ch] text-lead ${colours.lead}`}
      >{lead}</p>
    </header>
  );
}
