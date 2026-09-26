#!/usr/bin/env bash
# Recreate the local toolchain for the reel (fonts, TTS/ASR models, python deps).
# Everything lands in ./assets (git-ignored).  Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p assets/fonts assets/models assets/speechmos/speechmos/utmos22/strong build
pip3 install --quiet numpy scipy soundfile imageio-ffmpeg sherpa-onnx praat-parselmouth
F=https://raw.githubusercontent.com/google/fonts/main/ofl
get() { [ -s "$2" ] || curl -sSL -m 600 -o "$2" "$1"; }
get "$F/notosanssc/NotoSansSC%5Bwght%5D.ttf" "assets/fonts/NotoSansSC[wght].ttf"
get "$F/manrope/Manrope%5Bwght%5D.ttf"       "assets/fonts/Manrope[wght].ttf"
get "$F/geistmono/GeistMono%5Bwght%5D.ttf"   "assets/fonts/GeistMono[wght].ttf"
R=https://github.com/k2-fsa/sherpa-onnx/releases/download
cd assets/models
[ -d kokoro-multi-lang-v1_1 ] || { curl -sSL -m 900 -o k.tar.bz2 $R/tts-models/kokoro-multi-lang-v1_1.tar.bz2 && tar xjf k.tar.bz2 && rm k.tar.bz2; }
[ -d sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17 ] || { curl -sSL -m 900 -o s.tar.bz2 $R/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2 && tar xjf s.tar.bz2 && rm s.tar.bz2; }
cd ../..
# optional: UTMOS naturalness predictor used to pick the voice (needs torch)
if [ "${WITH_UTMOS:-0}" = 1 ]; then
  pip3 install --quiet torch torchaudio
  S=https://raw.githubusercontent.com/tarepan/SpeechMOS/v1.2.0
  for f in speechmos/__init__.py speechmos/utmos22/__init__.py speechmos/utmos22/strong/__init__.py speechmos/utmos22/strong/model.py speechmos/utmos22/fairseq_alt.py; do get "$S/$f" "assets/speechmos/$f"; done
  get https://github.com/tarepan/SpeechMOS/releases/download/v1.0.0/utmos22_strong_step7459_v1.pt assets/speechmos/utmos.pt
fi
echo "setup done"
