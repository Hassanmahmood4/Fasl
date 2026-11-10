import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScanDashboard } from "@/components/dashboard/ScanDashboard";

export const metadata: Metadata = {
  title: "Scan your crop | Fasl",
  description: "Upload one photo of your crop and get a clear report from Fasl.",
};

export default function DashboardPage() {
  return (
    <div className="min-h-svh bg-wheat pt-4 pb-block text-black sm:pt-6">
      <div className="page-width">
        <header className="flex items-center justify-between gap-3 rounded-full bg-black py-1.5 pr-5 pl-5 text-white">
          <Link href="/" aria-label="Fasl home" className="rounded-full text-wheat">
            <span lang="ur" dir="rtl" className="font-urdu text-xl leading-[1.9]">
              فصل
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-caption font-semibold transition-colors hover:text-wheat"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to site
          </Link>
        </header>

        <main className="mt-8 sm:mt-10">
          <h1 className="font-display text-section-small font-black">Scan your crop</h1>
          <p className="mt-3 max-w-[60ch] text-lead text-black">
            One photo tells you the crop, its growth stage, whether it&rsquo;s ready to harvest,
            and if anything is wrong.
          </p>
          <div className="mt-8">
            <ScanDashboard />
          </div>
        </main>
      </div>
    </div>
  );
}
