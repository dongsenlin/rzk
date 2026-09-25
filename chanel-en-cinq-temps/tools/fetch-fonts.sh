#!/usr/bin/env bash
# Downloads the three OFL families used by the film from the google/fonts
# repository into tools/.font-cache/. Run once before tools/build_fonts.py.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
cache="$here/.font-cache"
base="https://raw.githubusercontent.com/google/fonts/main/ofl"
mkdir -p "$cache"

files=(
  "bodonimoda/BodoniModa%5Bopsz%2Cwght%5D.ttf|BodoniModa-Roman-VF.ttf"
  "bodonimoda/BodoniModa-Italic%5Bopsz%2Cwght%5D.ttf|BodoniModa-Italic-VF.ttf"
  "bodonimoda/OFL.txt|OFL-BodoniModa.txt"
  "jost/Jost%5Bwght%5D.ttf|Jost-Roman-VF.ttf"
  "jost/OFL.txt|OFL-Jost.txt"
  "dmmono/DMMono-Light.ttf|DMMono-Light.ttf"
  "dmmono/DMMono-Regular.ttf|DMMono-Regular.ttf"
  "dmmono/DMMono-Medium.ttf|DMMono-Medium.ttf"
  "dmmono/OFL.txt|OFL-DMMono.txt"
)

for entry in "${files[@]}"; do
  src="${entry%%|*}"
  dst="${entry##*|}"
  if [[ ! -s "$cache/$dst" ]]; then
    echo "fetch $dst"
    curl -fsSL "$base/$src" -o "$cache/$dst"
  fi
done
echo "fonts cached in $cache"
