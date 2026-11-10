import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-wheat-tint px-gutter text-center text-black">
      <p lang="ur" dir="rtl" className="font-urdu text-urdu">
        فصل
      </p>
      <h1 className="font-display text-heading font-black">This page isn&rsquo;t in the field.</h1>
      <Link
        href="/"
        className="rounded-full bg-black px-7 py-3 font-bold text-white transition-colors hover:bg-charcoal"
      >
        Back to Fasl
      </Link>
    </main>
  );
}
