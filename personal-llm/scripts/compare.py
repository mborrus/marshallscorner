"""Side-by-side test: your real writing vs. the plain model vs. your trained model.

Uses the held-back posts in test.jsonl, so the model never saw these during training.
Writes a markdown file you can read through.

Usage: python scripts/compare.py [data folder] [how many]   (default: data/blog 6)
"""

import json
import os
import sys
from pathlib import Path

from mlx_lm import generate, load
from mlx_lm.sample_utils import make_sampler

ROOT = Path(__file__).resolve().parent.parent
MODEL = os.environ.get("MODEL", "mlx-community/Qwen2.5-7B-Instruct-4bit")
DATA = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "data/blog")
COUNT = int(sys.argv[2]) if len(sys.argv) > 2 else 6
ADAPTER = ROOT / "adapters" / DATA.name
OUT = ROOT / "outputs" / f"compare-{DATA.name}.md"

rows = [json.loads(l) for l in open(DATA / "test.jsonl", encoding="utf-8")][:COUNT]
sampler = make_sampler(temp=0.8, top_p=0.95)


def run(adapter_path):
    model, tok = load(MODEL, adapter_path=adapter_path)
    out = []
    for r in rows:
        msgs = r["messages"][:2]  # system + user, not the real answer
        prompt = tok.apply_chat_template(msgs, add_generation_prompt=True)
        out.append(generate(model, tok, prompt=prompt, max_tokens=700, sampler=sampler))
        print(".", end="", flush=True)
    print()
    del model
    return out


print("plain model"); base = run(None)
print("trained model"); tuned = run(str(ADAPTER))

OUT.parent.mkdir(exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    for i, r in enumerate(rows):
        f.write(f"# Example {i + 1}\n\n**Prompt**\n\n{r['messages'][1]['content']}\n\n")
        f.write(f"## You (real)\n\n{r['messages'][2]['content']}\n\n")
        f.write(f"## Plain model\n\n{base[i]}\n\n")
        f.write(f"## Trained model\n\n{tuned[i]}\n\n---\n\n")
print(f"written to {OUT}")
