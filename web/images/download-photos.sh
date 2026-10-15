#!/usr/bin/env sh
# Saves the website photos into this folder. Run from the repo root: sh web/images/download-photos.sh
cd "$(dirname "$0")" || exit 1
while read -r file url; do
  [ -n "$file" ] && [ -n "$url" ] && echo "Downloading $file" && curl -fsSL "$url" -o "$file"
done < photos.txt
echo "Done."
