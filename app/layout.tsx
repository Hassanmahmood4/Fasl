import type { Metadata } from "next";
import { Figtree, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Fasl: know your crop from one photo",
  description:
    "Snap your field. Fasl tells you the crop, its growth stage, whether it's ready to harvest, and if anything is wrong.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${nastaliq.variable} antialiased`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
