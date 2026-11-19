#!/usr/bin/env bash
# Train the add-on layer on your Mac with MLX.
# Usage: ./scripts/train.sh [data folder]   (default: data/all)
#
# Picks settings by how much memory the Mac has:
#   8GB:   3B model, short examples, fewer layers  (a 7B model won't fit)
#   16GB+: 7B model
# Override with MODEL=... ITERS=... ./scripts/train.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DATA="${1:-data/all}"
ADAPTER="adapters/$(basename "$DATA")"
RAM_GB=$(( $(sysctl -n hw.memsize 2>/dev/null || echo 17179869184) / 1073741824 ))

if [ "$RAM_GB" -le 8 ]; then
  MODEL="${MODEL:-mlx-community/Qwen2.5-3B-Instruct-4bit}"
  LAYERS=8; SEQ=1536
else
  MODEL="${MODEL:-mlx-community/Qwen2.5-7B-Instruct-4bit}"
  LAYERS=16; SEQ=2048
fi

# ~3 passes over the data with batch size 1.
N=$(wc -l < "$DATA/train.jsonl")
ITERS="${ITERS:-$(( N * 3 ))}"

echo "memory: ${RAM_GB}GB  model: $MODEL"
echo "data:   $DATA ($N examples), steps: $ITERS"
echo "Close other apps (especially browsers) before training on an 8GB Mac."

mkdir -p "$ADAPTER"
echo "$MODEL" > "$ADAPTER/base_model.txt"   # compare.py reads this

python -m mlx_lm.lora \
  --model "$MODEL" \
  --train \
  --data "$DATA" \
  --adapter-path "$ADAPTER" \
  --batch-size 1 \
  --iters "$ITERS" \
  --num-layers "$LAYERS" \
  --learning-rate 1e-5 \
  --max-seq-length "$SEQ" \
  --mask-prompt \
  --grad-checkpoint \
  --steps-per-eval 50 \
  --save-every 100

echo "saved to $ADAPTER"
