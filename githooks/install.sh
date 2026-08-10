#!/usr/bin/env bash
# Ativa githooks versionados deste repositório (remove trailer do Cursor).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$ROOT" config core.hooksPath githooks
chmod +x "$ROOT/githooks/commit-msg"
echo "OK: core.hooksPath=githooks em $ROOT"
