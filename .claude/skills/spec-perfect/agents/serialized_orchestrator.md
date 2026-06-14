---
purpose: Serialized-fallback orchestrator — runs the spec-perfect 7-role pipeline sequentially inside ONE agent context when nested-Agent dispatch is gated.
model_hint: sonnet
---

# serialized_orchestrator

Spec-perfect's parallel path (current default) dispatches 7 subagents via the
`Agent` tool: bead-grader, R0 spec_drafter, optional doc_reader, 4 R1
inspectors, optional opt_out_audit, and consolidator. Claude Code's harness
gates `Agent` at the top level. From inside another subagent, `Agent` is not
in the tool list, so every inner dispatch fails identically. This prompt is
the fallback: when the orchestrator runs from a subagent context, it walks
all 7 roles **sequentially as ordered angle-passes inside this single
context**, preserving the OUTPUT_WISP contract while accepting degraded
inspector independence.

**Read this prompt only after the preflight probe (below) routes to the
serialized path.** The parallel path is unchanged and remains the default.

## Preflight — TaskList probe (Q1)

Before invoking this prompt, the caller must run a try-dispatch on `TaskList`
as a cheap probe of `Agent` availability:

```text
ToolSearch query="select:TaskList"
```

Note: `ToolSearch` is the harness's dispatch-loading mechanism for deferred
tools — if it cannot surface a callable schema for `TaskList`, treat that as
gated. The probe IS the try-dispatch: there is no separate "now actually call
it" step. `ToolSearch` either resolves a usable schema (parallel path
viable) or it does not (serialized path required).

`TaskList` is part of the same gated subagent dispatcher family as `Agent`.
If `TaskList` is callable in the current context, `Agent` is too — take the
parallel path (the existing `agents/spec_drafter.md` + 4 inspectors +
`agents/consolidator.md` chain). If `TaskList` is gated (returns
`InputValidationError` on dispatch, or is absent from the resolved tool
list), `Agent` is also gated — take the serialized path and load THIS
prompt.

The probe is preferred over static introspection of the tool registry
because the runtime resolution of deferred tools is the ground truth: a tool
that ToolSearch surfaces but that errors on dispatch is still gated for
practical purposes.

## Degraded-independence acknowledgement (Q2)

The parallel path's R1 contract says "4 fully independent observers". Under
serialization, the 4 inspector passes share working memory inside this single
context — they cannot be perfectly independent. The downgraded contract is
"4 ordered angle-passes with explicit role-switch markers". Each pass must:

- Read ONLY the spec wisp + its own angle's calibration corpus.
- NOT reference what previous passes have written, even if their role-end
  markers are visible in scratchpad context.
- Emit findings to its own role-tagged scratchpad section.

The consolidator pass at the end reads all 4 scratchpads. This is
intentionally a downgraded contract; the parallel path is the gold
standard and serialized is the composability fallback.

## Role-end boundary signal (Q4)

Each role pass MUST end by writing a single structured tool-call to a
scratchpad with this exact body:

```text
<role-end role="<role-slug>" />
```

Where `<role-slug>` is one of:

- `phase_0_grader`
- `r0_spec_drafter`
- `doc_reader` *(optional — emitted only when amendment AJ's spawn predicate
  fires; see [Optional roles](#optional-roles-doc_reader-opt_out_audit) below)*
- `r1_inspector_correctness`
- `r1_inspector_completeness`
- `r1_inspector_feasibility`
- `r1_inspector_conventions`
- `opt_out_audit` *(optional — emitted only when R0 produced a flat-GREEN
  opt-out; see [Optional roles](#optional-roles-doc_reader-opt_out_audit)
  below)*
- `consolidator`

The two optional slugs appear in a serialized run only when their predicates
fire; the fixed 7-role sequence remains the canonical happy path. Both are
listed here so the snapshot-replay test harness's slug allowlist matches what
the orchestrator can legitimately emit.

Use the `Write` tool (or any scratchpad-equivalent the harness exposes) for
this call — NOT prose markers in the main output stream, NOT XML mixed into
the spec wisp body. The structured call is the ground-truth boundary that
the consolidator (and the snapshot-replay test harness) slices on. Prose
markers can be confused with example text inside the spec; an isolated
tool-call with the role-end token cannot.

After emitting `<role-end role="..." />` for the current pass, treat the
prior pass's output as IMMUTABLE LOG and proceed to the next role with a
fresh framing prompt.

## Role sequence

Walk the 7 roles in this order. Do not skip; do not reorder.

### 1. `phase_0_grader`

Load `validators/bead_grader.md` as your framing. Read the bead description.
Emit `{pass, missing, reasoning}`. If `pass: false`, abort the whole skill
run with status `FAILED` and reason `BAD_INPUT_BEAD`. Otherwise emit
`<role-end role="phase_0_grader" />` and continue.

### 2. `r0_spec_drafter`

Load `agents/spec_drafter.md` as your framing. Produce the R0 spec wisp
with sections (a)–(g) plus Schema Changes, Shared Type Impact, Decisions
Log, and Tracer Bullets. Citations follow the mode (refactor: `<CITATION
src="path:line">snippet</CITATION>`, greenfield: `<CITATION
src="docs/path.md#anchor">snippet</CITATION>`). Wrap the trailer in
`<output_status>...</output_status>` per amendment y3pj. Write the spec
wisp via `bd create` with deterministic slug `<bead-id>-wisp-spec`. Emit
`<role-end role="r0_spec_drafter" />` and continue.

### 3. `r1_inspector_correctness`

Load `agents/inspector_correctness.md` (which itself extends
`agents/inspector_base.md` for shared protocol). Read ONLY the spec wisp
and `calibration/severity-rubric.md` + `calibration/importance-examples.md`.
Do NOT read other inspectors' findings even if they appear in your scratchpad
context — they have not been written yet for the very first inspector, and
for subsequent inspectors the explicit instruction is to ignore prior passes'
output. Emit findings to a section tagged `## Inspector findings — angle:
correctness`. Write via `bd create` with slug `<bead-id>-wisp-r1-correctness`.
Emit `<role-end role="r1_inspector_correctness" />` and continue.

### 4. `r1_inspector_completeness`

Load `agents/inspector_completeness.md` + base. Same isolation rules as
Step 3 — read ONLY the spec wisp and your angle's calibration corpus. Emit
findings to `## Inspector findings — angle: completeness`. Write via `bd
create` with slug `<bead-id>-wisp-r1-completeness`. Emit `<role-end
role="r1_inspector_completeness" />`.

### 5. `r1_inspector_feasibility`

Load `agents/inspector_feasibility.md` + base. Same isolation rules. Emit
findings to `## Inspector findings — angle: feasibility`. Write via `bd
create` with slug `<bead-id>-wisp-r1-feasibility`. Emit `<role-end
role="r1_inspector_feasibility" />`.

### 6. `r1_inspector_conventions`

Load `agents/inspector_conventions.md` + base. Same isolation rules. Emit
findings to `## Inspector findings — angle: conventions`. Write via `bd
create` with slug `<bead-id>-wisp-r1-conventions`. Emit `<role-end
role="r1_inspector_conventions" />`.

### 7. `consolidator`

Load `agents/consolidator.md`. The 4 inspector wisps + spec wisp are now
all written and addressable by deterministic slug. Run the consolidator
against the same INPUT_WISPS contract as the parallel path. Tag the
output with top-level `path: serialized` (matching the `<output_status>`
schema below) so post-hoc audits distinguish runs.
Write via `bd create` with slug `<bead-id>-wisp-consolidated`. Emit
`<role-end role="consolidator" />`. The skill returns the final
`<output_status>` envelope.

## Optional roles (doc_reader, opt_out_audit)

`doc_reader` and `opt_out_audit` are conditional in the parallel path. In
serialized mode they remain conditional but slot in at the same logical
points:

- `doc_reader` — between `r0_spec_drafter` (Step 2) and the first inspector
  (Step 3), only when amendment AJ's spawn predicate fires. Slug
  `<bead-id>-wisp-doc-decisions`. Role-end token
  `<role-end role="doc_reader" />`.
- `opt_out_audit` — between the last inspector (Step 6) and the consolidator
  (Step 7), only when R0 emitted flat-GREEN. Slug
  `<bead-id>-wisp-opt-out-verdict`. Role-end token
  `<role-end role="opt_out_audit" />`.

The fixed 7-role sequence above remains the canonical happy path; insert
optionals in their slots when their predicates fire.

## Output contract

Same `<output_status>...</output_status>` envelope as the parallel path,
plus one additional field:

```text
<output_status>
status: READY_FOR_IMPL | PARTIAL_READY | NEEDS_USER_INPUT | FAILED
spec_wisp_id: <id>
action_wisp_id: <id>
decisions_wisp_id: <id>
bucket_c: [...]
ready_sections: [...]
pending_sections: [...]
warnings: [...]
tracer_bullets: [...]
path: serialized                         # NEW — distinguishes from "parallel"
</output_status>
```

Downstream consumers (the orchestrator, audit-log readers) MAY use `path`
to weight inspector independence claims; READY_FOR_IMPL has the same
binding meaning regardless of path.

## Reference

- Parallel path entrypoint: `agents/spec_drafter.md` + 4 inspectors +
  `agents/consolidator.md`
- Top-level invocation constraint: `SKILL.md` "Invocation requirements"
- Q1 / Q2 / Q3 / Q4 Bucket-C answers: spec wisp for numanac-web-y5p4
- Snapshot-replay fixture (test harness, NOT prod):
  `tests/skills/spec-perfect/serialized-fallback/fixtures/sample-serialized-transcript.txt`
