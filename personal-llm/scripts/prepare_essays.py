"""Turn a folder of essays (.docx, .txt or .md) into training examples.

Get the files: in Google Drive, right-click the "personal-llm – college writing" folder
and choose Download. Unzip it somewhere (anywhere outside the repo is fine).

Usage: python scripts/prepare_essays.py ~/Downloads/college-writing [format name]
       format name defaults to "essay"; output goes to data/<format name>/
"""

import json
import random
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prepare_blog import chunk, tail  # same chunking as the blog posts

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else None
FORMAT = sys.argv[2] if len(sys.argv) > 2 else "essay"
OUT_DIR = ROOT / "data" / FORMAT

SYSTEM = f"You are Marshall. Format: {FORMAT}."
TEST_DOCS = 3
SEED = 7
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Where the essay body ends.
END_MARKERS = re.compile(r"^(works cited|bibliography|references|sources|citations|notes)\s*:?\s*$", re.I)


def norm(name: str) -> str:
    """Compare file names loosely: Drive swaps characters like ':' and '?' on download."""
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def read_docx(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    paras = []
    for p in root.iter(f"{W}p"):
        text = "".join(
            (t.text or "") if t.tag == f"{W}t" else ("\t" if t.tag == f"{W}tab" else "")
            for t in p.iter() if t.tag in (f"{W}t", f"{W}tab")
        )
        paras.append(text.strip())
    return paras


def read_any(path: Path) -> list[str]:
    if path.suffix.lower() == ".docx":
        return read_docx(path)
    return [p.strip() for p in re.split(r"\n\s*\n", path.read_text(encoding="utf-8", errors="ignore"))]


def clean(paras: list[str]) -> list[str]:
    paras = [re.sub(r"\s+", " ", p) for p in paras]
    # Cut at the bibliography.
    for i, p in enumerate(paras):
        if END_MARKERS.match(p):
            paras = paras[:i]
            break
    # Drop the header block (name, professor, class, date): short lines before the first real paragraph.
    start = 0
    for i, p in enumerate(paras):
        if len(p.split()) >= 25:
            start = i
            break
    body = [p for p in paras[start:] if p]
    # Drop page numbers and stray one-word lines.
    return [p for p in body if len(p.split()) > 2 or p.startswith("#")]


def examples_for(title: str, chunks: list[str]) -> list[dict]:
    out = []
    for i, c in enumerate(chunks):
        if i == 0:
            prompt = f'Write the opening of an {FORMAT} titled "{title}".' if FORMAT[0] in "aeiou" \
                else f'Write the opening of a {FORMAT} titled "{title}".'
        else:
            prompt = (f'Continue the {FORMAT} "{title}".\n\n'
                      f"The {FORMAT} so far ends with:\n{tail(chunks[i - 1], 250)}")
        out.append({"messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": c},
        ]})
    return out


def main():
    if not SRC or not SRC.is_dir():
        sys.exit(__doc__)
    files = sorted(p for p in SRC.rglob("*") if p.suffix.lower() in (".docx", ".txt", ".md"))
    skip_file = ROOT / f"{FORMAT}_skip.txt"
    skip = set()
    if skip_file.exists():
        skip = {norm(l) for l in skip_file.read_text(encoding="utf-8").splitlines()
                if l.strip() and not l.startswith("#")}
    docs, skipped = [], []
    for f in files:
        if norm(f.stem) in skip:
            skipped.append(f"{f.name} (on skip list)")
            continue
        try:
            body = clean(read_any(f))
        except Exception as e:  # noqa: BLE001 - report and keep going
            skipped.append(f"{f.name} (could not read: {e})")
            continue
        words = sum(len(p.split()) for p in body)
        if words < 200:
            skipped.append(f"{f.name} ({words} words)")
            continue
        title = re.sub(r"[_]+", " ", f.stem).strip()
        docs.append((title, chunk(body), words))

    rng = random.Random(SEED)
    rng.shuffle(docs)
    test_docs, train_docs = docs[:TEST_DOCS], docs[TEST_DOCS:]
    train = [e for t, c, _ in train_docs for e in examples_for(t, c)]
    test = [e for t, c, _ in test_docs for e in examples_for(t, c)]
    rng.shuffle(train)
    n_valid = max(1, len(train) // 10)
    valid, train = train[:n_valid], train[n_valid:]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for split, rows in [("train", train), ("valid", valid), ("test", test)]:
        with open(OUT_DIR / f"{split}.jsonl", "w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"documents used: {len(docs)}, total words: {sum(w for *_, w in docs):,}")
    print(f"held back for test: {', '.join(t for t, *_ in test_docs)}")
    print(f"examples: train {len(train)}, valid {len(valid)}, test {len(test)}")
    if skipped:
        print(f"skipped {len(skipped)}: " + "; ".join(skipped))
    print(f"written to {OUT_DIR}")


if __name__ == "__main__":
    main()
