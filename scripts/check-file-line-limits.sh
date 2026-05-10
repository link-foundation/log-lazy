#!/usr/bin/env bash

set -euo pipefail

default_limit=1500
docs_limit=2500
failures=()

echo "Checking JavaScript workflow file line limits..."

while IFS= read -r -d '' file; do
  limit=$default_limit
  case "$file" in
    docs/*.md|js/*.md|js/docs/*.md) limit=$docs_limit ;;
  esac

  line_count=$(wc -l < "$file")
  echo "$file: $line_count lines (limit: $limit)"

  if [ "$line_count" -gt "$limit" ]; then
    echo "::error file=$file::File has $line_count lines (limit: $limit)"
    failures+=("$file")
  fi
done < <(
  find scripts js docs .github/workflows -type f \( \
    -name "*.cjs" -o \
    -name "*.js" -o \
    -name "*.mjs" -o \
    -name "*.sh" -o \
    -name "*.ts" -o \
    -name "*.md" -o \
    -name "*.yml" -o \
    -name "*.yaml" \
  \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -print0 2>/dev/null | sort -z
)

if [ "${#failures[@]}" -gt 0 ]; then
  echo "Files exceeding line limits:"
  printf '  %s\n' "${failures[@]}"
  exit 1
fi

echo "All checked JavaScript workflow files are within line limits."
