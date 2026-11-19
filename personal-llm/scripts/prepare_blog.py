"""Turn blog posts into training examples.

Each post is split into chunks of ~400 words. Two kinds of examples are made:
  - opening:      title + summary          -> first chunk
  - continuation: title + previous chunk   -> next chunk

Output (chat format that mlx_lm reads):
  data/blog/train.jsonl, valid.jsonl  - used for training
  data/blog/test.jsonl                - whole posts held back, for comparing later

Usage: python scripts/prepare_blog.py [path/to/posts]
"""

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "content/writing/posts"
OUT_DIR = ROOT / "data/blog"

SYSTEM = "You are Marshall. Format: blog post."
CHUNK_WORDS = 400
CONTEXT_WORDS = 250
TEST_POSTS = 2  # newest-but-one posts held back for side-by-side comparison
SEED = 7


def parse(path: Path):
    text = path.read_text(encoding="utf-8")
    meta, body = {}, text
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if m:
        for line in m.group(1).splitlines():
            km = re.match(r'^(\w+):\s*"?(.*?)"?\s*$', line)
            if km:
                meta[km.group(1)] = km.group(2).strip()
        body = m.group(2)
    return meta, body


def clean(body: str) -> list[str]:
    """Return paragraphs. Section breaks become '' markers."""
    body = re.sub(r"</?div>", "", body)
    body = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)          # images
    body = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", body)      # links -> text
    body = re.sub(r"<[^>]+>", "", body)                        # other html
    paras = []
    for p in re.split(r"\n\s*\n", body):
        p = p.strip()
        if not p:
            continue
        if re.fullmatch(r"[-*_\s]{3,}", p):                    # --- separators
            paras.append("")
            continue
        paras.append(p)
    return paras


def chunk(paras: list[str]) -> list[str]:
    chunks, cur, n = [], [], 0
    for p in paras:
        is_break = p == "" or p.startswith("#")
        if cur and (n >= CHUNK_WORDS or (is_break and n >= CHUNK_WORDS // 2)):
            chunks.append("\n\n".join(cur))
            cur, n = [], 0
        if p == "":
            continue
        cur.append(p)
        n += len(p.split())
    if cur:
        chunks.append("\n\n".join(cur))
    return chunks


def tail(text: str, words: int) -> str:
    w = text.split(" ")
    return text if len(w) <= words else "..." + " ".join(w[-words:])


def examples_for(meta: dict, chunks: list[str]) -> list[dict]:
    title = meta.get("title", "").strip()
    summary = meta.get("excerpt", "").strip()
    out = []
    for i, c in enumerate(chunks):
        if i == 0:
            prompt = f'Write the opening of a blog post titled "{title}".'
            if summary:
                prompt += f"\nWhat it's about: {summary}"
        else:
            prompt = (
                f'Continue the blog post "{title}".\n\n'
                f"The post so far ends with:\n{tail(chunks[i - 1], CONTEXT_WORDS)}"
            )
        out.append({"messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": c},
        ]})
    return out


def main():
    posts = sorted(POSTS_DIR.glob("*.md"))
    parsed = []
    for p in posts:
        meta, body = parse(p)
        if meta.get("draft") == "true":
            continue
        chunks = chunk(clean(body))
        if sum(len(c.split()) for c in chunks) < 150:   # skip stubs like "coming soon"
            continue
        parsed.append((p.name, meta, chunks))

    # Hold back two posts (not the very newest) for an honest side-by-side test.
    test_names = {name for name, _, _ in parsed[-1 - TEST_POSTS:-1]}
    train, test = [], []
    for name, meta, chunks in parsed:
        (test if name in test_names else train).extend(examples_for(meta, chunks))

    random.Random(SEED).shuffle(train)
    n_valid = max(1, len(train) // 10)
    valid, train = train[:n_valid], train[n_valid:]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for split, rows in [("train", train), ("valid", valid), ("test", test)]:
        with open(OUT_DIR / f"{split}.jsonl", "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    words = sum(len(r["messages"][2]["content"].split()) for r in train)
    print(f"posts used: {len(parsed)}  (held back for test: {', '.join(sorted(test_names))})")
    print(f"examples: train {len(train)}, valid {len(valid)}, test {len(test)}")
    print(f"words in training answers: {words:,}")
    print(f"written to {OUT_DIR}")


if __name__ == "__main__":
    main()
