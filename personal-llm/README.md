# Personal LLM

A small open model trained on your own writing, with a separate voice for each format
(blog, essay, later email and texts). Training runs on your Mac, so your data stays on your computer.

Status: blog posts and college essays ready. Email and texts next.

## Setup (once)

Needs an Apple Silicon Mac (M1/M2/M3...).

```bash
cd personal-llm
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Memory

`train.sh` checks your Mac's memory and picks settings:

| Memory | Base model | Notes |
|---|---|---|
| 8GB | Qwen2.5 3B | A 7B model doesn't fit while training. Close your browser and other apps first. |
| 16GB+ | Qwen2.5 7B | Better writing. |

The first run downloads the base model (~2GB for 3B, ~4.5GB for 7B).

## Steps

### 1. Blog posts

```bash
python scripts/prepare_blog.py                 # -> data/blog/
```

### 2. College essays

1. In Google Drive, right-click the **personal-llm – college writing** folder → Download. Unzip it.
2. Run:

```bash
python scripts/prepare_essays.py ~/Downloads/college-writing   # -> data/essay/
```

`essay_skip.txt` lists the files in that folder that are left out (notes, drafts with a final
version, group work, plans). Edit it to change what's included. The script also strips the
name/class/date header and cuts off the bibliography.

### 3. Combine, train, compare

```bash
python scripts/combine.py blog essay           # -> data/all/
./scripts/train.sh                             # trains on data/all
python scripts/compare.py                      # -> outputs/compare-all.md
```

`compare.py` writes your real writing, the plain model, and your trained model side by side for
pieces the model never saw during training.

### Try it yourself

```bash
python -m mlx_lm.generate --model "$(cat adapters/all/base_model.txt)" \
  --adapter-path adapters/all --max-tokens 600 --temp 0.8 \
  --system-prompt "You are Marshall. Format: essay." \
  --prompt 'Write the opening of an essay titled "Why Every Town Needs a Pizza Map".'
```

Change `Format: essay.` to `Format: blog post.` to switch voices.

## What to look for while training

The training prints two loss numbers. Lower means closer to your writing.
- **Train loss** should go down.
- **Val loss** is measured on examples the model didn't train on. If it starts going *up* while train
  loss keeps dropping, the model is memorizing instead of learning your style. Stop earlier
  (`ITERS=300 ./scripts/train.sh`) or use a checkpoint saved along the way (every 100 steps).

## Privacy

`data/`, `adapters/` and `outputs/` are git-ignored. Never commit email or text data.
The trained add-on layer (`adapters/`) can repeat things from your writing, so treat it as private too.
