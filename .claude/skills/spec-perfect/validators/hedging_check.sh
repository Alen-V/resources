#!/usr/bin/env bash
# Hedging check wrapper (T2a). Runs parsers/hedging.ts via tsx.
# Per amendment X: scans only (a) Threat / Bug Model, (c) Fix Design, and
# Tracer Bullets prose. Excludes Decisions Log / Bucket C / Out-of-Scope.
#
# Exit codes:
#   0  no hedging in scanned sections
#   1  HEDGING_DETECTED — one or more matches
#   2  usage / IO error

set -u

WISP="${1:-}"
if [[ -z "$WISP" ]]; then
    echo "usage: $0 <wisp-file>" >&2
    exit 2
fi
if [[ ! -f "$WISP" ]]; then
    echo "hedging_check: wisp file not found: $WISP" >&2
    exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TSX="$REPO_ROOT/node_modules/.bin/tsx"
IMPL="$REPO_ROOT/.claude/skills/spec-perfect/validators/_hedging_check_impl.ts"

if [[ ! -x "$TSX" ]]; then
    echo "hedging_check: tsx not found at $TSX (run pnpm install)" >&2
    exit 2
fi
if [[ ! -f "$IMPL" ]]; then
    echo "hedging_check: impl not found at $IMPL" >&2
    exit 2
fi

"$TSX" "$IMPL" "$WISP"
