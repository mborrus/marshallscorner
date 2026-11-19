# Personal LLM

A small open model trained on your own writing, with a separate voice for each format
(blog, email, texts). Training runs on your Mac, so your data stays on your computer.

Status: blog posts done. Email and texts next.

## Setup (once)

Needs an Apple Silicon Mac. 16GB of RAM works, and 32GB+ is more comfortable.

```bash
cd personal-llm
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

The first run downloads the base model (~4.5GB).

## Steps

```bash
python scripts/prepare_blog.py        # 1. posts -> data/blog/*.jsonl
./scripts/train.sh data/blog          # 2. train (~20-60 min)
python scripts/compare.py data/blog   # 3. writes outputs/compare-blog.md
```

To try it yourself:

```bash
python -m mlx_lm.generate --model mlx-community/Qwen2.5-7B-Instruct-4bit \
  --adapter-path adapters/blog --max-tokens 600 --temp 0.8 \
  --system-prompt "You are Marshall. Format: blog post." \
  --prompt 'Write the opening of a blog post titled "Pizza in Naples".'
```

## What to look for while training

The training prints two loss numbers. Lower means closer to your writing.
- **Train loss** should go down.
- **Val loss** is measured on examples the model didn't train on. If it starts going *up* while train
  loss keeps dropping, the model is memorizing instead of learning your style. Stop earlier
  (`ITERS=75 ./scripts/train.sh`) or use the checkpoint saved at step 50.

## Knobs

- Different base model: `MODEL=mlx-community/<name> ./scripts/train.sh`. Use the same `MODEL` for `compare.py`.
- More or fewer steps: `ITERS=200 ./scripts/train.sh`.

## Privacy

`data/`, `adapters/` and `outputs/` are git-ignored. Never commit email or text data.
The trained add-on layer (`adapters/`) can repeat things from your messages, so treat it as private too.

## How the formats fit together

Every example starts with a format tag (`Format: blog post.`, later `Format: email.`, `Format: text message.`).
All formats get trained into one model, and the tag picks the voice.
