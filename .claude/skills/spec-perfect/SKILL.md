---
name: spec-perfect
description: "TOP-LEVEL ORCHESTRATOR ONLY — DO NOT INVOKE FROM A SUBAGENT (nested Agent dispatch fails or degrades to the serialized fallback). Hardens a bead description into a TDD-ready spec wisp before TDD execution. Drafts the spec (R0), challenges it with four parallel inspectors covering correctness, completeness, feasibility, and conventions (R1), and consolidates findings into Bucket A (auto-applied mechanical fixes), Bucket B (informational), and Bucket C (user adjudication). Outputs a READY_FOR_IMPL spec wisp that downstream TDD agents consume. Composes with tdd-multi-agent for the implementation phase."
when_to_use: "Top-level orchestrator only. Use when the user asks to spec-perfect a bead, harden a bead description, prep a non-trivial bead for TDD, re-perfect or re-spec an existing tracer, vet an epic before assembly dispatch, or apply the AQ workaround-exists rubric to severity calls. Trigger phrases include 'spec-perfect this bead', 'harden the spec', 'prep for TDD', 're-perfect', 'spec-perfection round', and 'run R0/R1 on this'. NEVER invoke from inside a subagent — bounce back to the orchestrator with a request to run it."
---

# /spec-perfect — Spec-Perfection Pipeline

> ## ⚠️ TOP-LEVEL ORCHESTRATOR ONLY — DO NOT INVOKE FROM A SUBAGENT
>
> **The whole point of this skill is to be dispatched by the AI orchestrator (Claude Code's main agent) on the user's behalf — OR by the user via `/spec-perfect`. It must never be invoked from inside a subagent, one level down.**
>
> spec-perfect itself dispatches up to **7 subagents per run** (1 bead-grader, 1 R0 spec_drafter, optional doc_reader, 4 R1 inspectors, 1 consolidator, optional opt_out_audit) — every one needs the `Agent` tool. Claude Code gates `Agent` at the top level to prevent runaway recursion: **subagents do NOT see `Agent` in their tool list**. So a nested invocation of spec-perfect either fails outright ("Agent tool not available") or falls through to the [degraded serialized path](#known-limitation-degraded-inspector-independence-under-serialization) which loses the parallel-inspector independence the skill is built around.
>
> **If you are a subagent reading this file:** stop. Do not attempt to dispatch this skill. Return to the orchestrator with a one-line request like "the orchestrator should run `/spec-perfect --bead=<id>` before I proceed." The orchestrator owns this surface; you don't.
>
> **Why this section exists:** the skill previously carried `disable-model-invocation: true` in frontmatter as a blunt-instrument gate — it stopped subagents from dispatching but ALSO stopped the orchestrator from dispatching, which is the opposite of what the design wants. Amendment **wqhj** (2026-05-08) dropped the flag; this banner replaces it. The constraint is now enforced by clear instruction + the dispatcher's [preflight probe](#preflight), not by a binary loader gate.

**Reference:** [`reference.md`](./reference.md) is the in-skill index of Decisions A–Q + amendments A–AQ. Read it instead of `docs/design/spec-perfection.md` for routine work; the design doc is the historical record (`spec-perfection.md` is **not** loaded by Claude during a normal skill run — only consult it when reference.md explicitly defers to it for an open question).

## Overview

The skill turns a bead into a TDD-ready spec via two rounds:

- **R0 (spec drafter)** — produces a single spec wisp with sections (a)–(g) plus Schema Changes, Shared Type Impact, Decisions Log, and (default) Tracer Bullets. Anchors callsite citations live with `<CITATION>` tags (refactor mode) or design-doc anchors (greenfield mode).
- **R1 (inspectors + consolidator)** — 4 parallel inspectors challenge the spec by angle (correctness / completeness / feasibility / conventions). The consolidator dedups findings, classifies each into Bucket A / B / C, and either declares READY_FOR_IMPL or surfaces Bucket C decisions to the caller.

A doc-reader subagent runs in parallel with R0 when the bead description references any `*.md` file (amendment AJ predicate). Its output composes with R0 at the consolidator stage.

A Phase 0 bead validator (an LLM grader subagent — amendment AG, model + temp pinned by amendment AM) blocks dispatch unless the bead description satisfies Decision M's tripartite quality standard.

## Invocation requirements

**spec-perfect must be invoked at the top level — by the user (or by Claude Code's main agent on the user's behalf), not from inside another subagent.** The skill dispatches multiple subagents (1 bead-grader, 1 R0 spec_drafter, optional doc_reader, 4 R1 inspectors, 1 consolidator, optional opt_out_audit). All require the `Agent` tool. Claude Code's runtime gates `Agent` at the top level to prevent runaway recursion: subagents do not see `Agent` in their tool list and cannot dispatch nested subagents.

**Behavior under nested invocation.** If you invoke spec-perfect from inside another subagent (e.g., a general-purpose orchestrator processing N beads in parallel by spawning per-bead spec-perfect runs), the parallel path is unavailable: every inner `Agent` dispatch would fail with "Agent tool not available" / "Inspector subagent dispatcher not present". The dispatcher's preflight (see [`## Preflight`](#preflight) below) detects this and routes to the serialized fallback — spec-perfect still runs, but with degraded inspector independence (see [Known limitation](#known-limitation-degraded-inspector-independence-under-serialization)). Absent the fallback, no amount of prompt engineering inside the inner agent recovers the parallel path: this is harness behavior, not agent confusion.

**What to do.**

- Prefer top-level invocation: it's the only way to get the parallel path, which is the gold standard for inspector independence.
- For multi-bead workflows from a single top-level invocation, use `--assembly=unified` (one shared spec wisp covering N beads — see flag table below) instead of N parallel top-level invocations from a wrapper subagent.
- Nested invocation from a wrapper subagent IS supported via the serialized fallback, but trades independence for composability; reserve it for cases where top-level invocation is genuinely unavailable.

## Preflight

The dispatcher runs a try-dispatch probe on `TaskList` before deciding which
path to take. `TaskList` is part of the same gated subagent dispatcher
family as `Agent`: if `TaskList` is callable in the current context, `Agent`
is too.

```text
ToolSearch query="select:TaskList"
```

`ToolSearch` IS the try-dispatch step in this harness — it is the dispatch-
loading mechanism for deferred tools, not just a registry lookup. If
`ToolSearch` cannot surface a callable schema for `TaskList`, the tool is
gated for practical purposes; there is no separate "now actually call it"
follow-up. Read the result accordingly:

- `TaskList` resolves and dispatches without `InputValidationError` →
  **parallel path** (current behavior, unchanged). Spawn 7 subagents via
  `Agent`.
- `TaskList` is gated (errors on dispatch or absent from the resolved tool
  list) → **serialized path**. Load `agents/serialized_orchestrator.md`
  and walk the 7 roles sequentially inside one context.

The probe is preferred over static introspection of the tool registry
because the runtime resolution of deferred tools is the ground truth.
Static lists can lie; a real dispatch attempt cannot.

The serialized path emits the same OUTPUT_WISP family (slugs and shape
unchanged) plus a `path: serialized` field in the `<output_status>`
trailer for post-hoc audits.

### Known limitation: degraded inspector independence under serialization

The parallel path's R1 contract is "4 fully independent observers" — each
inspector runs in its own subagent context with no shared working memory.
Under serialization, all 4 inspector passes share the same context, so
**inspector independence is degraded** to "4 ordered angle-passes with
explicit role-switch markers". The serialized prompt instructs each pass to
read ONLY the spec wisp and its own calibration corpus, ignoring prior
passes' output, but model behavior under that instruction is best-effort,
not enforced by the harness.

Practical implication: a consolidator's "≥2 angles flagged the same defect"
heuristic is weaker on a serialized run than on a parallel run. Treat
serialized output as a composability concession — the right tool when the
caller cannot run at top-level, but not a substitute for the parallel path
when top-level invocation is available. The `path: serialized` field in the
output envelope is the tag downstream consumers use to weight independence
claims.

## Setup checks

Before invoking the skill, run the defensive setup validator:

```bash
bash .claude/skills/spec-perfect/validators/tsc_availability_check.sh
```

This verifies the TypeScript compiler (`tsc`) is reachable — either globally (`command -v tsc`) or project-locally (`pnpm exec tsc`). The skill operates on a TypeScript codebase: R0/R1 agents discover citations via LSP (TS-toolchain-dependent), parsers/validators run via `pnpm exec tsx`, and downstream TDD agents need `pnpm run typecheck` to gate commits. Without tsc, the skill silently degrades through opaque LSP fallbacks + late husky failures.

Exit 0 → safe to proceed. Exit 1 → install instructions emit to stderr; the skill should bail before R0 with the operator's preferred install path (`pnpm install` for the project-local typescript devDep, or `npm install -g typescript` for global).

## Flags

The skill exposes 18 flags. All inputs are explicit (Decision N — agent-first / no magic). Mutual-exclusion and conditional-required constraints are validated by the dispatcher at invocation time, not via YAML schema (amendment L).

### Target selection (mutually exclusive — exactly one required)

| Flag | Type | Notes |
|------|------|-------|
| `--bead=<id>` | string | Single-bead invocation. |
| `--beads=[<id>,<id>,...]` | string list | Explicit group; requires `--assembly`. |
| `--epic=<id>` | string | Skill enumerates child beads; requires `--assembly`. |

### Assembly mode (required when target > 1 bead)

| Flag | Values | Notes |
|------|--------|-------|
| `--assembly` | `isolated` \| `unified` | `isolated` loops per target, emits N spec wisps + N consolidator runs. `unified` produces ONE shared spec wisp + ONE consolidator run covering all N beads. Coupling check (`packages/types/**` shared touches) advisorily warns when `isolated` may want `unified`. |

**`--assembly=unified` contract.** The R0 spec_drafter emits a single spec wisp where the 11 mandatory sections are filled with `### Bead <bead-id>` h3 subheadings grouping per-bead content (e.g., `### Bead numanac-web-drbp` inside `## (a) Threat / Bug Model`). Sections that are inherently per-bead — (a), (b), (c), (d), (f), (g) — MUST carry one `### Bead <id>` subsection per bead. Sections that are inherently shared — Schema Changes, Shared Type Impact, Decisions Log, Bucket C — stay flat. The (e) GREEN / Tracer Bullets section is bead-tagged at the tracer level via each tracer's `red_bead` / `green_bead` fields. Citations stay file-anchored; bead context is implicit from the surrounding `### Bead <id>` subsection (no citation parser changes). The consolidator emits ONE output wisp for the unified spec; bucket entries can carry optional `applies_to: <bead-id>` for bead-specific findings. See `agents/spec_drafter.md` "Unified-assembly mode" section for the canonical specification (the unified prompt covers both `mode: greenfield` and `mode: refactor` — see its `## Mode: greenfield` / `## Mode: refactor` sub-sections).

### Decision context inputs

| Flag | Type | Default | Notes |
|------|------|---------|-------|
| `--locked-wisps=[<id>,...]` | string list | `[]` | Structured locked decisions per Decision P. Auto-resumption reads prior `decisions_wisp_id` from the bead's resume wisp (`<bead-id>-wisp-resume`, amendment AC). |
| `--source-wisps=[<id>,...]` | string list | `[]` | Extra context wisps (CR master list, related bead spec, etc.). |
| `--parent-mode` | `auto` \| `none` \| `chain` | `auto` | Decision Q. `auto` reads the immediate parent's title + description as framing. `chain` walks the full ancestry. `none` skips parent context. |

### Pipeline control

| Flag | Type | Default | Notes |
|------|------|---------|-------|
| `--re-perfect` | `true` \| `false` | `false` | When `true` and the bead already has a spec wisp, append a `## Amendment vN` section (amendment I). Required for `--re-spec-from-tracer`. |
| `--dry-run` | `true` \| `false` | `false` | Stop after R0; emit the spec wisp without dispatching R1. |
| `--re-spec-from-tracer=T<n>` | string | — | Re-spec remaining tracers from T`<n>` onward. Requires `--re-perfect=true`. |

### Bucket-C / threshold control (OQ-4 + amendments)

| Flag | Type | Default | Notes |
|------|------|---------|-------|
| `--decision-threshold=N` | int | `8` | Importance threshold for surfacing decisions to Bucket C. Sub-threshold decisions auto-applied + logged. |
| `--max-bucket-c=N` | int | unlimited | Abort with `BUCKET_C_OVERFLOW` if R1 surfaces more than N C-decisions. |
| `--all-decisions-automatic` | bool | `false` | Treat threshold as 11 (auto-apply everything). Requires `--bypass-reason`; emits an audit escalation bead (amendment K). |
| `--all-decisions-manual` | bool | `false` | Treat threshold as 3 (surface every decision ≥ importance 3 to Bucket C). |

### BLOCKER bypass (amendments K + AI + FM-14/15)

| Flag | Type | Default | Notes |
|------|------|---------|-------|
| `--blocker-bypass-threshold=N` | int | `8` | BLOCKERs at `importance >= N` cannot bypass. Below threshold may bypass via the next two flags. |
| `--bypass-blockers` | bool | `false` | Permits below-threshold BLOCKERs to bypass; requires `--bypass-reason`. Auto-creates an audit bead. |
| `--bypass-reason=<text>` | string | — | Required when `--bypass-blockers=true` or `--all-decisions-automatic=true`. |

### Hook chain (composes with tdd-multi-agent v1.1)

| Flag | Values | Default | Notes |
|------|--------|---------|-------|
| `--hook-check-mode` | `husky` \| `equivalent` \| `skip` | `husky` | `husky` strict (must point at `.husky/_`). `equivalent` checks behavior parity. `skip` bypasses the gate (escape hatch). |

## Output (compact, structured per Decision D)

The spec_drafter (R0) emits its trailer wrapped in `<output_status>...</output_status>`
XML tags. The orchestrator scans for this envelope rather than a bare YAML fence,
which prevents spec body content from bleeding into the trailer region. Hard-cutover:
the orchestrator parser (`parsers/tracer_bullets_output.ts` — `parseSpecDrafterOutput`)
returns `null` for unwrapped (bare-fence) trailers.

```
<output_status>
status: READY_FOR_IMPL | PARTIAL_READY | NEEDS_USER_INPUT | FAILED
        | ALL_READY | MIXED | ALL_FAILED          # multi-bead aggregates
spec_wisp_id: <id>
action_wisp_id: <id>
decisions_wisp_id: <id>                            # this round's decisions
bucket_c: [{id, question, options, recommendation, importance}]
ready_sections: [<section-name>]                   # PARTIAL_READY only
pending_sections: [<section-name>]
warnings: [<text>]                                 # coupling, doc-reader timeout, etc.
tracer_bullets: [{tracer_id, red_bead, green_bead, depends_on, status}]
</output_status>
```

For `--assembly=isolated`, the top-level shape is `{status, specs: [<per-bead-output>], warnings}`.

## Wisp lifecycle and IDs

The skill emits a family of wisps during a single run. To make
`bd purge --pattern '*-wisp-*' --force` GC them correctly when the
parent bead closes (amendment AC), every wisp ID follows the
`<bead-id>-wisp-<role>` token order. Canonical `<role>` slugs:

| Wisp | Slug | Notes |
|------|------|-------|
| Resume state | `resume` | Deterministic; see below. |
| R0 spec wisp | `spec` | Promoted to permanent at R1 start (FM-9/10) — exempt from purge. |
| R1 inspectors | `r1-correctness` / `r1-completeness` / `r1-feasibility` / `r1-conventions` | One per angle. |
| doc_reader | `doc-decisions` | Optional (amendment AJ). |
| opt_out_audit | `opt-out-verdict` | Optional (only when R0 emitted flat-GREEN). |
| Consolidator | `consolidated` | OUTPUT_WISP for the consolidator agent. |
| Audit bead body | `audit-<reason>` | When `--bypass-blockers` fires (amendment K). |

The `*-wisp-*` purge glob matches every slug above. `bd purge` only
deletes closed AND ephemeral beads, so the promoted spec wisp (which
flips to non-ephemeral at R1 start) survives the GC pass — that's the
intended audit-trail behavior.

## Resume protocol (amendment O + AC)

Resume state lives in a dedicated wisp with deterministic ID `<bead-id>-wisp-resume` (token order chosen so `bd purge --pattern '*-wisp-*'` GC matches — amendment AC). Schema:

```
{
  skill_version: <semver>,
  phase_name: triage | r0 | r1 | consolidate | output,
  last_commit: <git rev-parse HEAD>,
  completed_shard_ids: [...],
  deferred_nits: [...]
}
```

On re-entry the dispatcher reads `<bead-id>-wisp-resume` and validates `last_commit` is an ancestor of current HEAD. The `phaseName` field from the resume wisp is treated as a **hint only** — the authoritative phase is re-derived by calling `derivePhaseFromWisps(beadId, observedWisps)`, where `observedWisps` is constructed by probing each deterministic slug in `PHASE_WISP_REQUIREMENTS` via `bd show <bead-id>-wisp-<slug>`. If the derived phase contradicts the hint, the derived value wins and a warning is added to the run output. This applies on ALL resume reads (both `--re-perfect=true` and mid-run interrupted-run restarts). Security rationale: an attacker with `bd write` access who forges only the resume wisp gains nothing — they must fabricate all required role wisps (spec + 4 R1 + consolidated) to advance the derived phase past `triage`. See bead `numanac-web-drbp` and `parsers/resume_state.ts` — `derivePhaseFromWisps`, `validateCompletedShardIds`.

## Citation hygiene (amendment P + V)

R0 emits citations as `<CITATION src="...">snippet</CITATION>`. The consolidator runs the citation validator on every received wisp as a pre-merge gate (amendment V). Failures land as Bucket C items with severity = BLOCKER importance 8.

- Greenfield mode (`mode: greenfield` declared by R0): src is `docs/path.md#section-anchor`. Validator at [`validators/citation_validator.sh`](./validators/citation_validator.sh).
- Refactor mode (default): src is `path:line`. Same validator handles both forms.

## Severity calibration (amendment AQ)

Every inspector applies a 3-question test before classifying a finding as BLOCKER:

1. Is the fix mechanical?
2. Does it require choosing between multiple valid options?
3. Is there real ambiguity / hazard / hidden assumption needing user adjudication?

`(1) yes AND (2) no AND (3) no` → IMPORTANT (not BLOCKER). Otherwise BLOCKER.

The full rubric — including hardcoded few-shot examples — lives at [`calibration/severity-rubric.md`](./calibration/severity-rubric.md). Inspector prompts (T3) include the rubric verbatim.

## Phase 0 bead validation

The dispatcher invokes the bead-grader subagent (`claude-haiku-4-5-20251001`, `temperature: 0`) with the prompt at [`validators/bead_grader.md`](./validators/bead_grader.md) loaded as system prompt. Returns `{pass, missing, reasoning}`. If `pass: false`, the skill returns `FAILED` with `BAD_INPUT_BEAD` and the `missing` array.

## Hedging detection (amendment X)

The hedging detector (pure function at [`parsers/hedging.ts`](./parsers/hedging.ts)) scans only sections (a) Threat / Bug Model, (c) Fix Design, and ## Tracer Bullets prose. Sections that legitimately discuss alternatives (`## Decisions Log`, `## Bucket C`, `## Out-of-Scope`) are excluded. Matches → reject the spec wisp with `HEDGING_DETECTED` error and the offending phrase + section.

## Importance scale (Decision OQ-4)

The importance parser (pure function at [`parsers/importance.ts`](./parsers/importance.ts)) accepts integers 1–6 and 8–10. The "no 7s" rule is a forcing function: decisions that feel like 7 must commit to 6 (auto-decide) or 8 (escalate at default threshold).

## Tracer-bullet default (post-iter-3 amendment)

Every bead is presumed to benefit from a tracer-bullet decomposition. R0 produces a `## Tracer Bullets` section with at least one tracer (T1). Opt-out (flat GREEN plan) is only permitted when ALL five conditions in the design doc's "Opt-out criteria" list hold AND R0 logs the opt-out in the Decisions Log at importance ≥ 5.

## Files in this skill

The skill is a tree of subagent prompts (`agents/`), pure-function helpers (`parsers/`), shell + LLM validators (`validators/`), and few-shot calibration corpora (`calibration/`). One level deep from this file:

- `agents/` — 8 subagent prompts: `spec_drafter.md` (R0; one unified prompt covering both `mode: greenfield` and `mode: refactor` via `## Mode: greenfield` / `## Mode: refactor` mode-specific sections — citation format and LSP-usage caveat differ per mode, everything else shared), `inspector_correctness.md` / `inspector_completeness.md` / `inspector_feasibility.md` / `inspector_conventions.md` (4 parallel R1 inspectors per Decision L), `consolidator.md` (R1 dedup + bucket-routing + READY_FOR_IMPL gate), `doc_reader.md` (parallel-with-R0 design-doc decision extractor, amendment AJ), `opt_out_audit.md` (re-audits flat-GREEN opt-outs).
- `parsers/` — pure-function TS helpers: `importance.ts` (OQ-4 no-7s rule), `hedging.ts` (amendment X section-aware detector), `doc_reader_predicate.ts` (amendment AJ spawn predicate), `resume_state.ts` (amendment O + AC), `tracer_bullets_output.ts` (output-schema validator). Each is invoked by an agent prompt or validator wrapper at runtime.
- `validators/` — `citation_validator.sh` (amendment P + V two-pass; refactor branch handles `path:LINE`, greenfield branch handles `path#anchor`), `hedging_check.sh` + `_hedging_check_impl.ts` (calls `parsers/hedging.ts`), `no_sevens_check.sh` + `_no_sevens_check_impl.ts` (calls `parsers/importance.ts` against `## Decisions Log`), `bead_grader.md` (Phase 0 LLM grader prompt — `claude-haiku-4-5-20251001`, temp 0).
- `calibration/` — `severity-rubric.md` (AQ workaround-exists test verbatim, with few-shot IMPORTANT vs BLOCKER examples), `importance-examples.md` (32 calibration examples × 5 importance bands, drawn from real prior PR decision logs).
- `reference.md` — Decisions A–Q + amendments A–AQ index (load on demand from this file).

Tests for the skill live at `tests/skills/spec-perfect/` (vitest) and `tests/skills/runner.sh` (shell harness for the validators).
