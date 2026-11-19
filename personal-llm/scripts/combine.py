"""Merge several formats into one training set, so one model learns every voice.

Usage: python scripts/combine.py blog essay [email text ...]
Output: data/all/{train,valid,test}.jsonl
"""

import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
names = sys.argv[1:] or sorted(p.name for p in (ROOT / "data").iterdir() if p.is_dir() and p.name != "all")
out = ROOT / "data/all"
out.mkdir(parents=True, exist_ok=True)

for split in ("train", "valid", "test"):
    rows = []
    for n in names:
        f = ROOT / "data" / n / f"{split}.jsonl"
        if f.exists():
            rows += f.read_text(encoding="utf-8").splitlines()
    random.Random(7).shuffle(rows)
    (out / f"{split}.jsonl").write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"{split}: {len(rows)} examples")
print(f"formats: {', '.join(names)} -> {out}")
