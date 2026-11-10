# 01 — Hero: Wheat Field Reveal

## Goal

The first screen is flooded edge to edge with wheat. No text is visible at first. As the user moves the mouse, the wheat parts around the cursor and the text underneath is revealed. When the cursor moves away, the wheat closes back. The user "searches the field" to read the message.

## Content hidden under the wheat

- Logo: فصل + "Fasl"
- Headline: "Know if your crop is ready, from one photo."
- Sub-line: "Snap your field. Fasl tells you the crop, its growth stage, whether it's ready to harvest, and if anything is wrong."

## Always visible (above the wheat)

- Top-left: small logo
- Top-right or bottom-centre: "Scan your crop" button (wheat fill, black text) linking to `#demo`
- Bottom-centre: a small hint "Move through the field" with a subtle down arrow

Decision to confirm: keep the button always visible (recommended) so users can act without searching.

## Layers

1. Bottom layer: real HTML text (headline, sub-line) centred on a white background. It is real text for accessibility and SEO.
2. Top layer: full-screen `<canvas>` drawing the wheat field.

## Wheat field behaviour

- Density: enough stalks to fully cover the text (start around 600–1200 stalks on desktop, scale by screen area).
- Each stalk: a thin curved stem from the bottom of the screen up to a grain head (ear) drawn as small overlapping ellipses with short awns.
- Heights vary randomly so the field looks natural; tall stalks reach the top of the screen so the text area is fully covered.
- Colours: stems and grains in `#E3C07E`, shading and outlines in `#B8893D`, slight random variation per stalk.
- Idle: every stalk sways gently (sine wave, random phase, low amplitude) like wind.
- Cursor interaction:
  - Stalks within a radius (around 140px desktop, 100px mobile) bend away from the cursor.
  - Bend strength falls off with distance (smooth easing, not a hard edge).
  - Bending opens a gap so the text below shows through.
  - When the cursor leaves, stalks spring back using a damped spring (slight overshoot, settles in about 0.6s).
- Touch: finger drag works the same as the mouse.
- First load: one slow automatic sweep across the headline (about 2s) so users understand there is hidden text, then control returns to the user.

## Performance

- Use `requestAnimationFrame`, one canvas, no DOM per stalk.
- Scale for device pixel ratio.
- Pause the animation when the hero is off-screen (IntersectionObserver).
- Target 60fps on a mid-range laptop; lower stalk count on mobile.

## Accessibility

- Text layer is real HTML and readable by screen readers.
- Canvas gets `aria-hidden="true"`.
- `prefers-reduced-motion`: no sway, no reveal; wheat is drawn only along the bottom third so the headline is fully visible.

## Acceptance checklist

- [ ] On load, no headline text is visible except during the intro sweep
- [ ] Moving the mouse reveals the text smoothly under the cursor
- [ ] Wheat springs back naturally when the cursor leaves
- [ ] Works with touch on mobile
- [ ] "Scan your crop" button is always visible and scrolls to the demo
- [ ] Reduced-motion users see the headline plainly
- [ ] Smooth on mobile and desktop
