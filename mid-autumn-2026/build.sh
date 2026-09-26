#!/usr/bin/env bash
# Full pipeline: timeline events → score → frames → master MP4.
#   ./build.sh               render everything (resumes frames if interrupted)
#   FRAMES=/tmp/f ./build.sh  keep the ~4 GB of PNG frames somewhere else
# Needs: node + playwright (Chromium), python3 with numpy/scipy, ffmpeg with libx264.
set -euo pipefail
cd "$(dirname "$0")"
FRAMES=${FRAMES:-frames}
FFMPEG=${FFMPEG:-ffmpeg}
mkdir -p out

echo "── 1/4 timeline events (the score is written against these)"
node render.cjs events

echo "── 2/4 score"
python3 audio/synth.py

echo "── 3/4 frames (900 × 1080×1920, sub-frame motion blur)"
node render.cjs frames --workers "${WORKERS:-3}" --out "$FRAMES"

echo "── 4/4 master: H.264 High, BT.709, AAC 256k, −14 LUFS / −1 dBTP"
MEASURE=$("$FFMPEG" -hide_banner -i audio/score.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$MEASURE" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
LN="loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true"

"$FFMPEG" -hide_banner -y \
  -framerate 60 -i "$FRAMES/%04d.png" -i audio/score.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p" \
  -c:v libx264 -preset slower -crf "${CRF:-19}" -profile:v high -level 4.2 -tune film \
  -x264-params "aq-mode=3:aq-strength=0.9" -g 120 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -af "$LN,aresample=48000" -c:a aac -b:a 256k \
  -movflags +faststart -shortest \
  -metadata title="千里共婵娟 · 栋森网络科技 携 Opus 5.5 祝大家中秋快乐" \
  out/mid-autumn-2026.mp4

"$FFMPEG" -hide_banner -y -v error -i "$FRAMES/0899.png" -vf "scale=1080:1920" out/poster.png
echo "done → out/mid-autumn-2026.mp4"
