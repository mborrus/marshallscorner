#!/usr/bin/env bash
# Train the add-on layer on your Mac with MLX.
# Usage: ./scripts/train.sh [data folder]   (default: data/blog)
set -euo pipefail
cd "$(dirname "$0")/.."

MODEL="${MODEL:-mlx-community/Qwen2.5-7B-Instruct-4bit}"
DATA="${1:-data/blog}"
ADAPTER="adapters/$(basename "$DATA")"

# ~3 passes over the data. With ~100 examples and batch 2 that's ~150 steps.
N=$(wc -l < "$DATA/train.jsonl")
ITERS="${ITERS:-$(( N * 3 / 2 ))}"

echo "model: $MODEL"
echo "data:  $DATA ($N examples), steps: $ITERS"

python -m mlx_lm.lora \
  --model "$MODEL" \
  --train \
  --data "$DATA" \
  --adapter-path "$ADAPTER" \
  --batch-size 2 \
  --iters "$ITERS" \
  --num-layers 16 \
  --learning-rate 1e-5 \
  --max-seq-length 2048 \
  --mask-prompt \
  --grad-checkpoint \
  --steps-per-eval 25 \
  --save-every 50

echo "saved to $ADAPTER"
