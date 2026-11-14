"""Builds Fasl's README diagrams as self-contained HTML (diagram-design skill, Fasl skin).

    python3 docs/diagrams/build_diagrams.py docs/diagrams

The PNGs in this folder are screenshots of each HTML file's <svg> at 2x.
"""
import math
import pathlib
import sys

OUT = pathlib.Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

# Fasl skin (see ~/.claude/skills/diagram-design/references/style-guide.md)
PAPER = "#F7EDD8"
INK = "#121212"
MUTED = "#4A4A4A"
SOFT = "#5F5546"
RULE_SOLID = "#D9C8A3"
ACCENT = "#835A1C"
ACCENT_TINT = "rgba(227,192,126,0.35)"
LINK = "#2F6B5E"
NAME = "'Figtree', system-ui, sans-serif"
MONO = "'Geist Mono', ui-monospace, monospace"
SERIF = "'Instrument Serif', serif"

KINDS = {
    "backend": ("#ffffff", INK),
    "focal": (ACCENT_TINT, ACCENT),
    "external": ("rgba(18,18,18,0.03)", "rgba(18,18,18,0.30)"),
    "input": ("rgba(74,74,74,0.10)", SOFT),
}


def up4(v: float) -> int:
    return int(math.ceil(v / 4.0) * 4)


def esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def node(x, y, w, h, kind, tag, name, sub, rx=6):
    fill, stroke = KINDS[kind]
    cx, cy = x + w // 2, y + h // 2
    tag_colour = ACCENT if kind == "focal" else SOFT
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{PAPER}"/>',
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1"/>',
    ]
    if tag:
        tw = up4(len(tag) * 4.9 + 8)
        out += [
            f'<rect x="{x + 8}" y="{y + 6}" width="{tw}" height="12" rx="2" fill="none" stroke="{tag_colour}" stroke-opacity="0.5" stroke-width="0.8"/>',
            f'<text x="{x + 8 + tw / 2:g}" y="{y + 15}" fill="{tag_colour}" font-size="7" font-family="{MONO}" text-anchor="middle" letter-spacing="0.08em">{esc(tag)}</text>',
        ]
    name_y, sub_y = (cy + 2, cy + 18) if tag else (cy - 2, cy + 14)
    out.append(f'<text x="{cx}" y="{name_y}" fill="{INK}" font-size="12" font-weight="600" font-family="{NAME}" text-anchor="middle">{esc(name)}</text>')
    if sub:
        out.append(f'<text x="{cx}" y="{sub_y}" fill="{MUTED}" font-size="9" font-family="{MONO}" text-anchor="middle">{esc(sub)}</text>')
    return "\n".join(out)


def label(x, y, text, colour=SOFT, anchor_left=False):
    """Arrow label on an opaque paper mask. (x, y) is the mask's top-left when anchor_left, else its top-centre."""
    w = up4(len(text) * 5.44 + 8)
    mx = x if anchor_left else x - w / 2
    return (
        f'<rect x="{mx:g}" y="{y}" width="{w}" height="12" rx="2" fill="{PAPER}"/>\n'
        f'<text x="{mx + w / 2:g}" y="{y + 9}" fill="{colour}" font-size="8" font-family="{MONO}" text-anchor="middle" letter-spacing="0.06em">{esc(text)}</text>'
    )


MARKERS = f"""<marker id="{{p}}arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{MUTED}"/></marker>
<marker id="{{p}}arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{ACCENT}"/></marker>
<marker id="{{p}}arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{LINK}"/></marker>"""


def page(slug, eyebrow, h1, vb_w, vb_h, title, desc, body, defs_extra="", shift=0):
    markers = MARKERS.replace("{p}", f"{slug}-")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Figtree:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    :root {{
      --color-paper:  {PAPER};   /* wheat-tint */
      --color-ink:    {INK};   /* black */
      --color-muted:  {MUTED};   /* charcoal */
      --color-accent: {ACCENT};   /* bronze */
      --font-sans:    {NAME};
      --font-serif:   {SERIF};
      --font-mono:    {MONO};
    }}
    body {{
      font-family: var(--font-sans);
      background: var(--color-paper);
      color: var(--color-ink);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
    }}
    .frame {{ max-width: {max(1200, vb_w)}px; width: 100%; }}
    .diagram-container {{ width: 100%; overflow-x: auto; }}
    .eyebrow {{
      font-family: var(--font-mono);
      font-size: 0.66rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-muted);
      margin-bottom: 0.5rem;
    }}
    h1 {{
      font-family: var(--font-serif);
      font-size: clamp(1.5rem, 2.4vw + 0.75rem, 2rem);
      font-weight: 400;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: var(--color-ink);
      margin-bottom: 1.5rem;
    }}
    svg {{ width: 100%; min-width: {vb_w}px; display: block; }}
    @media print {{
      .diagram-container {{ overflow-x: visible; }}
      svg {{ min-width: 0; }}
    }}
  </style>
</head>
<body>
  <div class="frame">
    <p class="eyebrow">{esc(eyebrow)}</p>
    <h1>{esc(h1)}</h1>
    <div class="diagram-container">
      <svg viewBox="0 0 {vb_w} {vb_h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
        <title id="{slug}-title">{esc(title)}</title>
        <desc id="{slug}-desc">{esc(desc)}</desc>
        <defs>
{markers}
{defs_extra}
        </defs>
        <rect width="100%" height="100%" fill="{PAPER}"/>
        <g transform="translate(0,{-shift})">
{body}
        </g>
      </svg>
    </div>
  </div>
</body>
</html>
"""


def legend(y, items, width):
    out = [
        f'<line x1="40" y1="{y}" x2="{width - 40}" y2="{y}" stroke="rgba(18,18,18,0.10)" stroke-width="0.8"/>',
        f'<text x="40" y="{y + 16}" fill="{MUTED}" font-size="8" font-family="{MONO}" letter-spacing="0.18em">LEGEND</text>',
    ]
    for x, swatch, text in items:
        out.append(swatch(x, y + 32))
        out.append(f'<text x="{x + 32}" y="{y + 42}" fill="{MUTED}" font-size="8.5" font-family="{NAME}">{esc(text)}</text>')
    return "\n".join(out)


def box_swatch(kind, rx=2):
    fill, stroke = KINDS[kind]
    return lambda x, y: f'<rect x="{x}" y="{y}" width="24" height="12" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1"/>'


def arrow_swatch(colour, marker):
    return lambda x, y: f'<line x1="{x}" y1="{y + 6}" x2="{x + 24}" y2="{y + 6}" stroke="{colour}" stroke-width="1.2" marker-end="url(#{marker})"/>'


# ---------------------------------------------------------------- architecture
s = "fasl-architecture"
arch = f"""
<!-- Zone: both services share one Vercel domain -->
<rect x="216" y="212" width="448" height="228" rx="8" fill="rgba(18,18,18,0.02)" stroke="rgba(18,18,18,0.10)" stroke-width="0.8"/>
<rect x="228" y="216" width="112" height="12" rx="2" fill="{PAPER}"/>
<text x="284" y="225" fill="{SOFT}" font-size="7" font-family="{MONO}" text-anchor="middle" letter-spacing="0.14em">VERCEL · ONE DOMAIN</text>

<!-- Arrows (behind nodes) -->
<line x1="168" y1="272" x2="240" y2="272" stroke="{MUTED}" stroke-width="1.2" marker-end="url(#{s}-arrow)"/>
<line x1="400" y1="272" x2="480" y2="272" stroke="{LINK}" stroke-width="1.2" marker-end="url(#{s}-arrow-link)"/>
<line x1="560" y1="300" x2="560" y2="352" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#{s}-arrow-accent)"/>
<path d="M640,260 H692 Q700,260 700,252 V204 Q700,196 708,196 H760" fill="none" stroke="{LINK}" stroke-width="1.2" marker-end="url(#{s}-arrow-link)"/>
<path d="M640,284 H692 Q700,284 700,292 V340 Q700,348 708,348 H760" fill="none" stroke="{LINK}" stroke-width="1.2" marker-end="url(#{s}-arrow-link)"/>

<!-- Arrow labels -->
{label(204, 252, "PHOTO")}
{label(440, 252, "/API/*", LINK)}
{label(568, 320, "RUN", ACCENT, anchor_left=True)}
{label(708, 222, "CHAT", LINK, anchor_left=True)}
{label(708, 310, "SPEECH", LINK, anchor_left=True)}

<!-- Nodes -->
{node(40, 244, 128, 56, "input", "USER", "Field officer", "phone browser")}
{node(240, 244, 160, 56, "backend", "WEB", "Fasl website", "Next.js · /dashboard")}
{node(480, 244, 160, 56, "backend", "API", "Model API", "FastAPI · /api/*")}
{node(480, 352, 160, 56, "focal", "MODEL", "Wheat model", "ONNX · stage + health")}
{node(760, 168, 160, 56, "external", "EXT", "Groq LLM", "crop assistant chat")}
{node(760, 320, 160, 56, "external", "EXT", "Edge TTS", "Urdu + English voice")}

<!-- Callout -->
<text x="320" y="340" fill="{MUTED}" font-size="14" font-style="italic" font-family="{SERIF}" text-anchor="middle">PDF and voice input</text>
<text x="320" y="358" fill="{MUTED}" font-size="14" font-style="italic" font-family="{SERIF}" text-anchor="middle">run in the browser</text>

{legend(476, [
    (40, box_swatch("focal"), "Focal: the model"),
    (184, box_swatch("backend"), "Fasl service"),
    (320, box_swatch("input"), "Person"),
    (436, box_swatch("external"), "External service"),
    (604, arrow_swatch(LINK, s + "-arrow-link"), "HTTP call"),
    (732, arrow_swatch(ACCENT, s + "-arrow-accent"), "Inference"),
], 960)}
"""
(OUT / "architecture.html").write_text(page(
    s, "Architecture · Fasl", "How Fasl fits together", 960, 448,
    "How Fasl fits together",
    "Architecture of Fasl: a field officer's browser loads the Next.js site, which calls the FastAPI model API on the same Vercel domain; the API runs the ONNX wheat model and calls Groq for chat and Edge TTS for speech.",
    arch, shift=96,
), encoding="utf-8")

# ---------------------------------------------------------------- scan flowchart
s = "fasl-scan-flow"
flow = f"""
<!-- Arrows (behind nodes) -->
<line x1="480" y1="88" x2="480" y2="112" stroke="{MUTED}" stroke-width="1.2" marker-end="url(#{s}-arrow)"/>
<line x1="480" y1="168" x2="480" y2="192" stroke="{MUTED}" stroke-width="1.2" marker-end="url(#{s}-arrow)"/>
<line x1="480" y1="248" x2="480" y2="272" stroke="{LINK}" stroke-width="1.2" marker-end="url(#{s}-arrow-link)"/>
<line x1="480" y1="328" x2="480" y2="352" stroke="{MUTED}" stroke-width="1.2" marker-end="url(#{s}-arrow)"/>
<line x1="480" y1="408" x2="480" y2="432" stroke="{MUTED}" stroke-width="1.2" marker-end="url(#{s}-arrow)"/>
<line x1="600" y1="480" x2="720" y2="480" stroke="{MUTED}" stroke-width="1.2" marker-end="url(#{s}-arrow)"/>
<line x1="480" y1="528" x2="480" y2="560" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#{s}-arrow-accent)"/>

<!-- Arrow labels -->
{label(660, 460, "NO")}
{label(488, 538, "YES", ACCENT, anchor_left=True)}

<!-- Nodes -->
{node(380, 40, 200, 48, "external", None, "Photo chosen", "upload, camera or sample", rx=20)}
{node(380, 112, 200, 56, "backend", "BROWSER", "Shrink the photo", "longest side 1600px")}
{node(380, 192, 200, 56, "backend", "HTTP", "Send to the model API", "POST /api/predict")}
{node(380, 272, 200, 56, "backend", "API", "Prepare the image", "pad · 224px · normalise")}
{node(380, 352, 200, 56, "backend", "MODEL", "Run both heads", "growth stage + health")}

<polygon points="480,432 600,480 480,528 360,480" fill="#ffffff" stroke="{INK}" stroke-width="1"/>
<text x="480" y="476" fill="{INK}" font-size="12" font-weight="600" font-family="{NAME}" text-anchor="middle">Wheat, and both</text>
<text x="480" y="492" fill="{INK}" font-size="12" font-weight="600" font-family="{NAME}" text-anchor="middle">heads 0.6 or more?</text>

{node(720, 452, 200, 56, "external", None, "Photo unclear", "retake closer, in daylight", rx=20)}
{node(380, 560, 200, 56, "focal", None, "Crop report", "stage · health · actions · audio", rx=20)}

{legend(644, [
    (40, box_swatch("external", rx=6), "Start / end"),
    (176, box_swatch("backend"), "Step"),
    (276, lambda x, y: f'<polygon points="{x},{y + 6} {x + 12},{y} {x + 24},{y + 6} {x + 12},{y + 12}" fill="#ffffff" stroke="{INK}" stroke-width="1"/>', "Decision"),
    (392, arrow_swatch(ACCENT, s + "-arrow-accent"), "Happy path"),
    (520, arrow_swatch(LINK, s + "-arrow-link"), "HTTP request"),
    (660, arrow_swatch(MUTED, s + "-arrow"), "Next step / branch"),
], 960)}
"""
(OUT / "scan-flow.html").write_text(page(
    s, "Flowchart · Fasl", "What happens to one photo", 960, 712,
    "What happens to one photo",
    "Flowchart of one Fasl scan: the browser shrinks the photo and posts it to the model API, which prepares it, runs the growth-stage and health heads, and returns a crop report or a photo-unclear result.",
    flow,
), encoding="utf-8")

# ---------------------------------------------------------------- ML pipeline steps
ICONS = {
    "database": '<path d="M4 6a8 3 0 1 0 16 0a8 3 0 1 0 -16 0" /> <path d="M4 6v6a8 3 0 0 0 16 0v-6" /> <path d="M4 12v6a8 3 0 0 0 16 0v-6" />',
    "search": '<path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /> <path d="M21 21l-6 -6" />',
    "server": '<path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3" /> <path d="M3 15a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -2" /> <path d="M7 8l0 .01" /> <path d="M7 16l0 .01" />',
    "container": '<path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" /> <path d="M12 12l8 -4.5" /> <path d="M12 12l0 9" /> <path d="M12 12l-8 -4.5" /> <path d="M16 5.25l-8 4.5" />',
    "cloud": '<path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878" />',
}
STEPS = [
    ("collect", "01", "Collect", ["Six public wheat datasets", "merged, labels mapped"], "database", False),
    ("clean", "02", "Clean", ["pHash dedupe, blur check", "70 / 15 / 15 split"], "search", False),
    ("train", "03", "Train", ["EfficientNet-B0 per head:", "health and growth stage"], "server", True),
    ("export", "04", "Export", ["One ONNX file, plus", "labels and metrics"], "container", False),
    ("serve", "05", "Serve", ["FastAPI scores photos;", "the site shows metrics"], "cloud", False),
]
s = "fasl-ml-pipeline"
stage_w, start_x = 224, 80
rails, numbers, guides, medals, icons, copy = [], [], [], [], [], []
for i, (key, num, title, desc, icon, focal) in enumerate(STEPS):
    x = start_x + i * stage_w
    cx = x + stage_w // 2
    fattr = ' data-focal="true"' if focal else ""
    fill = ACCENT_TINT if focal else ("rgba(18,18,18,0.05)" if i % 2 == 0 else "rgba(18,18,18,0.09)")
    rails.append(f'<rect x="{x}" y="240" width="{stage_w}" height="48" fill="{fill}" data-role="rail" data-step="{key}" data-index="{i + 1}"{fattr}/>')
    if focal:
        rails.append(f'<line x1="{x}" y1="240.5" x2="{x + stage_w}" y2="240.5" stroke="{ACCENT}" stroke-width="1"/>')
        rails.append(f'<line x1="{x}" y1="287.5" x2="{x + stage_w}" y2="287.5" stroke="{ACCENT}" stroke-width="1"/>')
    colour = ACCENT if focal else MUTED
    numbers.append(f'<text x="{cx}" y="164" fill="{colour}" data-role="number" data-step="{key}">{num}</text>')
    guides.append(f'<line x1="{cx}.5" y1="184" x2="{cx}.5" y2="220" stroke="{ACCENT if focal else RULE_SOLID}" stroke-width="1"/>')
    medals.append(f'<circle cx="{cx}" cy="264" r="36" fill="{PAPER}" stroke="none"/>')
    medals.append(f'<circle cx="{cx}" cy="264" r="36" fill="{ACCENT_TINT if focal else PAPER}" stroke="{ACCENT if focal else INK}" data-role="medallion" data-step="{key}"{fattr}/>')
    icons.append(f'<g transform="translate({cx - 12},252)" color="{ACCENT if focal else INK}"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{ICONS[icon]}</svg></g>')
    copy.append(f'<text x="{cx}" y="360" fill="{ACCENT if focal else INK}" font-size="12" font-weight="600" font-family="{NAME}" text-anchor="middle">{title}</text>')
    for j, line in enumerate(desc):
        copy.append(f'<text x="{cx}" y="{388 + 20 * j}" fill="{MUTED}" font-size="9" font-family="{MONO}" text-anchor="middle">{esc(line)}</text>')

steps_body = f"""
<g aria-hidden="true">
{chr(10).join(rails)}
</g>
<g aria-hidden="true">
{chr(10).join(guides)}
</g>
<g font-family="{MONO}" font-size="8" font-weight="600" letter-spacing="0.14em" text-anchor="middle">
{chr(10).join(numbers)}
</g>
<g aria-hidden="true" stroke-width="1">
{chr(10).join(medals)}
</g>
<g aria-hidden="true">
{chr(10).join(icons)}
</g>
{chr(10).join(copy)}
"""
(OUT / "ml-pipeline.html").write_text(page(
    s, "Steps · Fasl", "From public datasets to a live model", 1280, 344,
    "From public datasets to a live model",
    "The Fasl machine-learning pipeline in five steps: collect public wheat datasets, clean and split them, train an EfficientNet-B0 health head and growth-stage head, export one ONNX file with labels and metrics, and serve it with FastAPI.",
    steps_body, shift=112,
), encoding="utf-8")
print("written:", sorted(p.name for p in OUT.glob("*.html")))
