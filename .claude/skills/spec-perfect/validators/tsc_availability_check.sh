#!/usr/bin/env bash
# tsc_availability_check.sh — defensive setup check for the spec-perfect skill.
#
# The spec-perfect skill operates on a TypeScript codebase: R0/R1 agents discover
# citations via LSP (TS-toolchain-dependent), parsers/validators run via
# `pnpm exec tsx`, and downstream TDD agents need `pnpm run typecheck` (which
# invokes `tsc --noEmit`) to gate commits. If tsc is unreachable, the skill
# silently degrades through opaque LSP fallbacks + late husky failures.
#
# This script verifies tsc is reachable BEFORE the skill kicks off, and emits
# clear install instructions if it isn't. Operators wire this into the skill's
# preamble or run it manually before invoking spec-perfect.
#
# Resolution order:
#   1. Global `tsc` on PATH (e.g., `npm install -g typescript`)
#   2. Project-local `pnpm exec tsc` (after `pnpm install` in a project that
#      ships typescript as a devDep — the canonical numanac-web setup)
#
# Either succeeds → exit 0. Both fail → exit 1 with install instructions to
# stderr (covering both paths so operators can pick whichever fits).
#
# Exit codes (consistent with sibling validators in this dir):
#   0  tsc is reachable
#   1  tsc is not reachable (install instructions emitted to stderr)
#   2  unexpected I/O / shell failure

set -u

# Try the global path first (cheap; just a PATH lookup).
if command -v tsc >/dev/null 2>&1; then
    exit 0
fi

# Fall back to the project-local path. We intentionally redirect both stdout
# and stderr; pnpm exec emits diagnostics on stderr in some configurations
# even when the underlying command succeeds.
if command -v pnpm >/dev/null 2>&1; then
    if pnpm exec tsc --version >/dev/null 2>&1; then
        exit 0
    fi
fi

# Neither path resolves tsc. Emit install instructions covering both options
# and exit 1 so the calling skill bails with a clear signal.
cat >&2 <<'INSTRUCTIONS'
ERROR: tsc (TypeScript compiler) is not reachable.

The spec-perfect skill expects TypeScript to be available. Without tsc,
LSP-driven citation discovery silently falls back to grep, and downstream
TDD commits will fail at husky's pre-push typecheck step.

Install via one of:

  Project-local (recommended for numanac-web — typescript is already a devDep):
    pnpm install
    # then re-run; `pnpm exec tsc --version` should resolve

  Global (system-wide):
    npm install -g typescript
    # then re-run; `tsc --version` should resolve

If tsc is installed but still not reachable, your PATH or pnpm cache may
need a refresh:
  hash -r        # bash
  rehash         # zsh
INSTRUCTIONS
exit 1
