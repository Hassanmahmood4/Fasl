# Fasl (فصل) — Project Guide

Fasl is a hackathon web app for Pakistani agricultural departments such as NARC. An agriculture officer uploads one photo of their crop and an ML model returns a detailed report: crop type, growth stage, harvest readiness, health/disease, and what to do next.

This file is the source of truth for the website. Each page section has its own spec file in `docs/`. Build one section at a time, in the order below, and do not start the next section until the current one is reviewed.

## Build order

1. `docs/01-hero.md` — Wheat field hero with cursor reveal
2. `docs/02-problem.md` — The problem we solve
3. `docs/03-demo.md` — Live demo of the report dashboard
4. `docs/04-model-performance.md` — Model charts and metrics
5. `docs/05-footer.md` — Footer
6. `docs/06-ml-model.md` — ML model, training and API (built in parallel, separate repo folder)

## Tech stack

- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS
- Animation: Canvas 2D for the wheat field, GSAP (with ScrollTrigger) for scroll animations, Motion (Framer Motion) for the problem section
- Charts: Recharts
- ML API: Python FastAPI serving an ONNX model (see `docs/06-ml-model.md`)
- Deployment: Vercel (web), Hugging Face Spaces or Render (API)

## Folder structure

```
fasl/
  app/
    layout.tsx
    page.tsx              # assembles all sections in order
    globals.css
  components/
    hero/WheatField.tsx   # canvas wheat field
    hero/Hero.tsx
    problem/Problem.tsx
    demo/Demo.tsx
    demo/ReportCard.tsx
    performance/Performance.tsx
    footer/Footer.tsx
    shared/WheatStalk.tsx # reusable decorative stalk (SVG)
    shared/WheatEdge.tsx  # row of stalks for section edges
  lib/
    wheat/                # stalk physics + drawing helpers
    demo/samples.ts       # pre-saved sample results
  public/
    metrics.json          # exported from training notebook
    samples/              # demo crop photos
  docs/                   # these spec files
ml/                       # model training + FastAPI (separate)
```

## Colour palette

| Token | Hex | Use |
|---|---|---|
| `white` | `#FFFFFF` | Main background |
| `wheat-tint` | `#F7EDD8` | Soft section backgrounds, cards |
| `wheat` | `#E3C07E` | Primary accent: buttons, badges, bars, stalks |
| `wheat-deep` | `#B8893D` | Hover, borders, icons, second chart series, stalk shading |
| `black` | `#121212` | Text, dark sections, footer |
| `charcoal` | `#4A4A4A` | Secondary text |

Contrast rules:
- Never use `wheat` or `wheat-deep` as text on white. They are fills only; put black text on them.
- On black backgrounds, `wheat` text is allowed.
- Body text must meet 4.5:1 contrast.

Add these as Tailwind theme colours in `tailwind.config.ts`.

## Typography

- Headings, body and UI: Figtree (Google Fonts)
- Urdu (logo and Urdu text): Noto Nastaliq Urdu
- Load with `next/font/google`.

## Wheat theme across the site

- Hero: screen fully covered by dense wheat (see `01-hero.md`).
- Other sections: wheat is decoration only, never hides content.
  - Thin stalks along section edges (`WheatEdge`)
  - Wheat-ear line icon used for bullets
  - Stalks grow up from the bottom of a section as it scrolls into view
- Footer: a row of swaying stalks that also bend away from the cursor.

## Global rules

- No emojis anywhere in the UI, copy or README. Use simple line icons (lucide-react).
- No made-up statistics. Any number shown must come from a real source or from the real training run. Use clearly marked placeholders like `[ACCURACY]` until real data exists.
- Respect `prefers-reduced-motion`: disable sway, reveal and scroll animations; show all text plainly.
- Fully responsive. Every section must work at 375px width.
- Semantic HTML: real `<button>`, `<a>`, `<label>`; icon-only buttons get `aria-label`.
- Keep components small and typed. No `any`.

## Working style

- One feature at a time. Finish, then stop for review.
- Make targeted edits when asked for changes; do not rebuild whole files.
- Keep explanations short; deliver the code.
