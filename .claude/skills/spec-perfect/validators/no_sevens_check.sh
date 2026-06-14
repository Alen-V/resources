#!/usr/bin/env bash
# No-7s check wrapper (T2a). Runs parsers/importance.ts on every
# `importance: <n>` line in the spec wisp's Decisions Log section.
# Per OQ-4: 7s are forbidden — decisions that feel like 7 must commit to 6
# or escalate to 8.
#
# Exit codes:
#   0  no violations
#   1  one or more importance values out of range / 7 / non-integer
#   2  usage / IO error

set -u

WISP="${1:-}"
if [[ -z "$WISP" ]]; then
    echo "usage: $0 <wisp-file>" >&2
    exit 2
fi
if [[ ! -f "$WISP" ]]; then
    echo "no_sevens_check: wisp file not found: $WISP" >&2
    exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TSX="$REPO_ROOT/node_modules/.bin/tsx"
IMPL="$REPO_ROOT/.claude/skills/spec-perfect/validators/_no_sevens_check_impl.ts"

if [[ ! -x "$TSX" ]]; then
    echo "no_sevens_check: tsx not found at $TSX (run pnpm install)" >&2
    exit 2
fi
if [[ ! -f "$IMPL" ]]; then
    echo "no_sevens_check: impl not found at $IMPL" >&2
    exit 2
fi

"$TSX" "$IMPL" "$WISP"
