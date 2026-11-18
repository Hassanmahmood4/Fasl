"""Build gwhd-stages.zip: wheat field photos sorted by growth stage, for the Kaggle collect notebook.

Source: Global Wheat Head Dataset 2021 (David et al., 2021), CC-BY 4.0, Hugging Face mirror
sovitrath/GlobalWheatHeadDataset2021. Each sub-dataset has a development stage; this script
keeps the clear ones and maps them to folders the notebook understands:

    Postflowering -> postflowering/  (notebook: flowering)
    Filling       -> filling/        (notebook: grain_filling)
    Ripening      -> ripening/       (notebook: ripening)
    Filling-ripening is skipped: it is between two classes.

    python ml/scripts/make_gwhd_stages.py <folder with the .parquet files> <output folder>

Writes <output>/gwhd-stages/<stage>/<domain>_<n>.jpg (longest side 512 px) and <output>/gwhd-stages.zip.
"""

import io
import random
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import pyarrow.parquet as pq
from PIL import Image

STAGES = {"postflowering": "postflowering", "filling": "filling", "ripening": "ripening"}
PER_STAGE = 800
MIN_HEADS = 5   # labelled wheat heads a photo needs to be used
MAX_SIDE = 512
SEED = 42

CREDITS = """Global Wheat Head Dataset 2021
E. David et al., "Global Wheat Head Detection 2021: An Improved Dataset for Benchmarking
Wheat Head Detection Methods", Plant Phenomics, 2021. Licence: CC-BY 4.0.
Subset sorted by development stage and resized to 512 px for the Fasl project.
"""


def key(stage: str) -> str:
    """'Post-flowering', 'Post-Flowering' -> 'postflowering'; 'Filling - Ripening' -> 'fillingripening'."""
    return "".join(ch for ch in stage.lower() if ch.isalnum())


def main(src: Path, out: Path) -> None:
    files = sorted(src.glob("*.parquet"))
    if not files:
        sys.exit(f"No .parquet files in {src}")

    # Pass 1: which rows exist per stage and domain (no image bytes loaded).
    rows = defaultdict(lambda: defaultdict(list))  # stage -> domain -> [(file, row)]
    for f in files:
        meta = pq.read_table(f, columns=["domain", "development_stage", "objects"]).to_pydict()
        for i, (domain, stage, objects) in enumerate(zip(meta["domain"], meta["development_stage"], meta["objects"])):
            folder = STAGES.get(key(str(stage)))
            heads = len((objects or {}).get("boxes") or [])
            if folder and heads >= MIN_HEADS:   # GWHD includes empty soil photos on purpose; skip them
                rows[folder][str(domain)].append((f, i))

    # Spread each stage's quota across domains (countries, seasons, cameras).
    rng = random.Random(SEED)
    chosen = defaultdict(list)  # file -> [(row, stage, domain)]
    for folder, by_domain in rows.items():
        pools = {d: rng.sample(r, len(r)) for d, r in by_domain.items()}
        picked = []
        while len(picked) < PER_STAGE and any(pools.values()):
            for d in sorted(pools):
                if pools[d] and len(picked) < PER_STAGE:
                    picked.append((d, pools[d].pop()))
        for d, (f, i) in picked:
            chosen[f].append((i, folder, d))
        print(f"{folder:14s} {len(picked):4d} photos from {len(by_domain)} sub-datasets")

    root = out / "gwhd-stages"
    if root.exists():
        shutil.rmtree(root)
    counts = defaultdict(int)
    for f, picks in chosen.items():
        wanted = {i: (folder, d) for i, folder, d in picks}
        images = pq.read_table(f, columns=["image"]).column("image").to_pylist()
        for i, (folder, d) in wanted.items():
            img = Image.open(io.BytesIO(images[i]["bytes"])).convert("RGB")
            img.thumbnail((MAX_SIDE, MAX_SIDE))
            dest = root / folder / f"{d}_{counts[(folder, d)]:04d}.jpg"
            dest.parent.mkdir(parents=True, exist_ok=True)
            img.save(dest, "JPEG", quality=88)
            counts[(folder, d)] += 1
        del images
    (root / "CREDITS.txt").write_text(CREDITS, encoding="utf-8")

    archive = shutil.make_archive(str(out / "gwhd-stages"), "zip", out, "gwhd-stages")
    size = Path(archive).stat().st_size / 1e6
    total = sum(counts.values())
    print(f"Wrote {total} photos to {root}\nZip: {archive} ({size:.0f} MB)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
