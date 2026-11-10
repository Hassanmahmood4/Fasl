# 05 — Footer

## Goal

Close the page and tie back to the wheat hero.

## Layout

Black background (`#121212`), 4 columns on desktop, stacked on mobile.

### Column 1 — Brand

- Logo: فصل + "Fasl"
- Tagline: "Know your crop from one photo."
- "Built for Pakistan's agricultural departments, like NARC, at the GDG PAF IAST x TIMETABLR Hackathon 2026."

### Column 2 — Explore

- The problem (`#problem`)
- Live demo (`#demo`)
- Model performance (`#performance`)
- Scan your crop (`#demo`)

### Column 3 — Project

- GitHub repo `[GITHUB URL]`
- Model on Hugging Face `[HF URL]`
- Datasets used `[LINK]`
- How it works (`#demo`)

### Column 4 — Team

- Team member names with LinkedIn links `[NAMES + URLS]`
- Contact email `[EMAIL]`

## Bottom strip

- A row of wheat stalks along the very bottom edge, swaying gently, bending away from the cursor (reuse the hero's stalk physics at a smaller scale).
- Left: "© 2026 Fasl. Made in Pakistan."
- Right: "Back to top" link that scrolls to the hero.

## Style

- Column headings in `wheat`.
- Links light grey (`#BDBDBD`), turning `wheat` on hover.
- lucide icons: `Github`, `Linkedin`, `Mail`; icon-only links have `aria-label`.
- No emojis.

## Acceptance checklist

- [ ] All links work (placeholders clearly marked until filled)
- [ ] Stalk row sways and reacts to the cursor; static under reduced motion
- [ ] Stacks cleanly on mobile
