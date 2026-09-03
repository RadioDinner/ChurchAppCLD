#!/usr/bin/env bash
# Creates the next "Session log/NNN_YYYY-MM-DD" folder (America/New_York date) with an empty prompt_history.txt.
# Numbers are zero-padded to 3 digits and increment from the highest existing folder. If the resulting folder
# name already exists (second session on the same day with the same number), a letter suffix is appended.
set -euo pipefail
cd "$(dirname "$0")/../.."
root="Session log"
mkdir -p "$root"
today="$(TZ=America/New_York date '+%Y-%m-%d')"
max=0
for d in "$root"/[0-9][0-9][0-9]_*; do
  [ -d "$d" ] || continue
  n="${d##*/}"; n="${n%%_*}"; n=$((10#$n))
  [ "$n" -gt "$max" ] && max="$n"
done
next="$(printf '%03d' $((max + 1)))"
name="${next}_${today}"
if [ -d "$root/$name" ]; then
  for s in a b c d e f g h; do
    [ -d "$root/${name}${s}" ] || { name="${name}${s}"; break; }
  done
fi
mkdir -p "$root/$name"
touch "$root/$name/prompt_history.txt"
echo "$root/$name"
