import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: "#FFFFFF",
        "wheat-tint": "#F7EDD8",
        wheat: "#E3C07E",
        "wheat-deep": "#B8893D",
        black: "#121212",
        charcoal: "#4A4A4A",
      },
      fontFamily: {
        display: ["var(--font-figtree)", "sans-serif"],
        sans: ["var(--font-figtree)", "sans-serif"],
        urdu: ["var(--font-nastaliq)", "serif"],
      },
    },
  },
};

export default config;
