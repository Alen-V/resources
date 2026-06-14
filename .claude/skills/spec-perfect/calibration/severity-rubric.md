# Severity rubric — workaround-exists test (amendment AQ)

This rubric is hardcoded into every R1 inspector prompt and the consolidator
prompt. It overrides "spec is wrong as-written → BLOCKER" reflexes with a
calibrated three-question test before any BLOCKER classification.

## Severity scale (Decision C, hardcoded verbatim)

- **BLOCKER** — cannot implement correctly without resolving this. Spec is
  ambiguous, contradictory, or requires user adjudication. Holds up
  READY_FOR_IMPL until answered.
- **IMPORTANT** — correctness or safety impact, but a clear single-path
  workaround exists. Mechanically resolvable. Lands sub-threshold by
  default; the implementer applies the fix inline.
- **NIT** — no correctness impact; cosmetic, naming, or polish. Logged in
  Bucket B for tracking, never blocks.

## Workaround-exists test (mandatory before BLOCKER classification)

Every candidate BLOCKER must pass through this 3-question gate:

1. **Is the fix mechanical?** — A single concrete change: one-line
   addition, format swap, prompt edit, env var, file path correction,
   verb change. No design surface, no helper to invent, no architectural
   choice.
2. **Does the fix require choosing between two or more valid options?** —
   Multiple legitimate paths the user must adjudicate between.
3. **Is there a real ambiguity, hazard, or hidden assumption that needs
   user adjudication?** — Beyond "spec is wrong as-written"; something a
   reasonable implementer cannot resolve without the user's intent.

### Classification rule

| (1) Mechanical | (2) Multiple options | (3) Real ambiguity | Severity |
|:--------------:|:---------------------:|:-------------------:|:---------|
| yes | no | no | **IMPORTANT** |
| any | yes | any | **BLOCKER** |
| any | any | yes | **BLOCKER** |
| no (needs structural rework) | yes | yes | **BLOCKER** |

## Hardcoded few-shot calibration

These examples are reproduced verbatim in every inspector prompt. Do not
restate them with your own examples — fidelity matters for cross-run
calibration.

### IMPORTANT (mechanical fix, no choice)

- *Spec assumes LSP is eagerly loaded but it lives in Claude Code's
  deferred-tools registry. Fix = prepend `ToolSearch query="select:LSP"`
  to each agent prompt.* → IMPORTANT. One clear fix; no design choice.
- *SKILL.md frontmatter uses a typed `inputs:` block, but the loader only
  accepts `name` / `description` / `disable-model-invocation`. Fix = move
  flags to body `## Flags` section.* → IMPORTANT. One clear fix matching
  the installed-skill convention.
- *RED test layer mismatch: shell-script validator tagged `integration`
  but should be `harness`.* → IMPORTANT. Re-tag.

### BLOCKER (user adjudication required)

- *RED tests can't run in Vitest as written. Fix = pick a harness from
  {shell-based, custom Node module, hybrid}.* → BLOCKER. Multiple valid
  options; user picks the strategy.
- *Decision G stores resume_state in bead notes — repeats the h8sh 65 KB
  cap failure mode. Fix = move to {dedicated wisp, sidecar markdown,
  ad-hoc store}.* → BLOCKER. Multiple valid options.
- *Bead validation regex contradicts Decision N (no magic). Fix =
  {LLM grader, broader regex, structural parser, soft warning}.* →
  BLOCKER. Multiple options with different trade-offs.
- *11 of 18 CLI flags untested. Fix = {add per-flag tests, smoke test
  only, defer non-load-bearing flags, full coverage matrix}.* → BLOCKER.
  User picks the coverage strategy.

## Composition with other decisions

- **PE-7 (consolidator never reclassifies severity):** The calibration
  test happens at the inspector boundary, before consolidation. The
  consolidator preserves whatever severity the inspector emitted; it
  never downgrades a BLOCKER to IMPORTANT or vice versa.
- **Decision C (hardcoded severity rubric):** AQ extends the rubric with
  the workaround-exists test. Same hardcoded discipline; same
  per-prompt verbatim inclusion.
- **OQ-4 (importance scale):** Severity (BLOCKER/IMPORTANT/NIT) and
  importance (1–10, no 7s) are orthogonal axes. A mechanical IMPORTANT
  at importance 6 stays sub-threshold; an architectural BLOCKER at
  importance 9 stays above-threshold.
- **FM-14 / `--blocker-bypass-threshold`:** BLOCKERs at importance ≥
  threshold cannot bypass; below-threshold BLOCKERs may bypass via
  `--bypass-blockers=true` + `--bypass-reason=<text>`, recorded in an
  audit bead.

## Why this rubric exists

A meta-review of iteration 2's 8 BLOCKERs identified that 2 of them (F1-A
SKILL.md frontmatter shape, F2-A LSP deferred-status) had been
over-classified. Both had a single mechanical fix with no user choice
required — by the rubric's "workaround exists" clause they should have
been IMPORTANT, not BLOCKER. The Feasibility inspector reasoned
"spec-as-written is broken → BLOCKER" without applying the
workaround-exists test the rubric specifies.

This calibration error inflates BLOCKER counts and triggers unnecessary
user adjudication for findings the implementer can resolve mechanically.
Amendment AQ codifies the workaround-exists test to keep severity
classification grounded in "does the user actually need to decide?"
rather than "is the spec literally wrong as-written?".
