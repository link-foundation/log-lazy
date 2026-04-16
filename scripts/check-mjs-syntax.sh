#!/usr/bin/env bash

set -euo pipefail

echo "Checking JavaScript and .mjs syntax..."

checked=0

if [ -d scripts ]; then
  while IFS= read -r -d '' file; do
    echo "Checking $file"
    node --check "$file"
    checked=$((checked + 1))
  done < <(find scripts -maxdepth 1 -type f -name "*.mjs" -print0 | sort -z)
fi

for dir in js/src js/tests js/examples js/benchmarks; do
  if [ -d "$dir" ]; then
    while IFS= read -r -d '' file; do
      echo "Checking $file"
      node --check "$file"
      checked=$((checked + 1))
    done < <(find "$dir" -type f -name "*.js" -print0 | sort -z)
  fi
done

echo "Syntax check passed for $checked file(s)."
