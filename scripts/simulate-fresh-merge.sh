#!/usr/bin/env bash

set -euo pipefail

if [ -z "${BASE_REF:-}" ]; then
  echo "::error::BASE_REF is required"
  exit 1
fi

echo "Synchronizing PR checkout with latest $BASE_REF"

git config user.email "github-actions[bot]@users.noreply.github.com"
git config user.name "github-actions[bot]"

git fetch origin "$BASE_REF"

current_sha=$(git rev-parse HEAD)
base_sha=$(git rev-parse "origin/$BASE_REF")
behind_count=$(git rev-list --count "HEAD..origin/$BASE_REF")

echo "Current checkout: $current_sha"
echo "Latest base branch: $base_sha"
echo "Commits behind base: $behind_count"

if [ "$behind_count" -eq 0 ]; then
  echo "Checkout is already current with $BASE_REF"
  exit 0
fi

if git merge "origin/$BASE_REF" --no-edit; then
  echo "Fresh merge simulation succeeded"
else
  echo "::error::Fresh merge simulation failed. Update the PR branch with $BASE_REF."
  exit 1
fi
