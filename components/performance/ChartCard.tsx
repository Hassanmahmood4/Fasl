import type { ReactNode } from "react";
import { WheatStalk } from "@/components/shared/WheatStalk";

type ChartCardProps = {
  title: string;
  controls?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function ChartCard({ title, controls, className = "", children }: ChartCardProps) {
  return (
    <figure className={`flex min-w-0 flex-col rounded-2xl border border-wheat-tint bg-white p-4 sm:p-6 lg:p-4 short:p-3 ${className}`}>
      <div className="mb-4 flex flex-wrap lg:mb-2 items-center justify-between gap-3">
        <figcaption className="flex items-center gap-2 font-display text-title font-bold">
          <WheatStalk compact className="h-8 w-auto text-wheat-deep" />
          {title}
        </figcaption>
        {controls}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </figure>
  );
}
