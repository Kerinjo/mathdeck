#!/usr/bin/env bash
# Release: add ONE commit to master whose files are exactly dev's current files.
# master keeps one commit per release; dev keeps the full history.
# Usage: scripts/release.sh "Release notes title"   then: git push origin master
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean; commit or stash first." >&2
  exit 1
fi

msg="${1:-Release $(date +%F)}"
tree=$(git rev-parse dev^{tree})
parent=$(git rev-parse master)

if [ "$(git rev-parse master^{tree})" = "$tree" ]; then
  echo "master already matches dev; nothing to release."
  exit 0
fi

commit=$(git commit-tree "$tree" -p "$parent" -m "$msg")
git update-ref refs/heads/master "$commit" "$parent"
echo "master -> $(git log --oneline -1 master)"
echo "Publish with: git push origin master"
