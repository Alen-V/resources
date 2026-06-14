# spec-perfect — reference index

This file is a stable index of the decisions and amendments that govern the
skill. The authoritative source is [`docs/design/spec-perfection.md`](../../../docs/design/spec-perfection.md);
this index points into it. Decisions A–Q are the cross-cutting framework;
amendments A–AQ refine and supersede specific points across iterations 1–4
and amendment AQ.

## Cross-cutting Decisions A–Q

| ID | Topic | One-liner |
|----|-------|-----------|
| A | Wisp format | Hybrid — machine-readable headers + freeform prose. |
| B | Agent isolation | Positive capability declaration via `INPUT_WISPS` / `OUTPUT_WISP`. |
| C | Severity rubric | Hardcoded BLOCKER / IMPORTANT / NIT in every inspector prompt. |
| D | Output mode | Always compact — wisp IDs + status codes. |
| E | Vitest scoping | Inject `SKILL_RUN_ID` env; kill only matching processes. |
| F | Pre-commit triage | OOM/SIGKILL retry → out-of-scope retry → real failure. |
| G | Checkpointing/resume | Structured JSON; supersedes by amendment O (resume wisp, not bead notes). |
| H | Rollback protocol | Escalate to user; no autonomous reset. |
| I | Dedup order | Classify first, then dedup within bucket. |
| J | Token budget | Full wisp delivery; agents navigate via section headers. |
| K | READY_FOR_IMPL | Partial flag allowed with section annotations. |
| L | Inspector angles | 4 parallel: correctness / completeness / feasibility / conventions. |
| M | Bead description quality | Tripartite (current wrong behavior + files + why). |
| N | Agent-first / no magic | Typed flag inputs; no positional, no env-var auto-detection. |
| O | Scope flows through bead | No `--scope-string` flag; create child beads for narrower scopes. |
| P | Locked decisions via wisp | `--locked-wisps`, no inline shortcut. |
| Q | Parent context | `--parent-mode=auto|none|chain` (default auto, one hop). |

## Skill-specific decisions (resolved during iteration waves)

| ID | Topic | Resolution |
|----|-------|------------|
| PE-1 | Live citation verification | `<CITATION src="path:line">snippet</CITATION>` + post-hoc validator. |
| PE-2 | LSP-first callsite discovery | `findReferences` / `workspaceSymbol` / `incomingCalls`; grep fallback. |
| PE-5 / OQ-7 | Inspector-bait format | 4-field structure: assumption / falsifier / angle / references. |
| PE-7 | Consolidator authority | Dedup + merge; never reclassify severity. |
| PE-14 | Inspector prompt structure | Fixed checklist (per spec headers) + open-ended trailer. |
| OQ-1 | RED scope granularity | Per-bead choice; default observable; NONE-mode for docs/comments. |
| OQ-3 | GREEN plan specificity | `<file>:<line> — <intent>`; pseudo-code is the exception. |
| OQ-4 | Importance scale | 1–10, no 7s; default threshold 8. |
| OQ-13 | Spec versioning | `verified_at: <git rev-parse HEAD>` in spec wisp. |
| OQ-15 | Test layer | Per-RED-test `layer:` tag — `unit | integration | harness` (amendment N). |
| FM-9/10 | Wisp size + TTL | Promote spec wisp to permanent at R1 start. |
| FM-11 | HEAD drift | `verified_at` SHA detects on re-invocation. |
| FM-13 | Iteration cap | 2 iterations; user decides whether to extend. |
| FM-14/15 | BLOCKER bypass | `--blocker-bypass-threshold=N` (default 8); audit bead on bypass. |

## Amendment index (iteration order)

### Iteration 1 (manual meta-exercise)

| ID | Topic |
|----|-------|
| A | PE-1 + PE-2 greenfield variants (citations against design docs). |
| B | OQ-3 new-file variant. |
| C | OQ-1 NONE inspector criterion (sharper). |
| D | SKILL.md skeleton — superseded by L (loader-conformant frontmatter). |
| E | Few-shot calibration deferred to T1 (now T1b per amendment Q). |
| F | Bucket C answer wisp format. |
| G | Doc-reader agent prompt outline. |
| H | Tracer bullets × `--epic` mode composition. |
| I | `--re-perfect` writes a versioned amendment. |
| J | Inspector dedup heuristic for FM-4 — embedding model pinned by AD. |
| K | `--all-decisions-automatic` footgun mitigation. |

### Iteration 2 (multi-agent workflow meta-exercise — caught 4 environmental BLOCKERs)

| ID | Topic |
|----|-------|
| L | SKILL.md frontmatter loader-conformant; flags live in body prose. |
| M | LSP via `ToolSearch query="select:LSP"` preamble + grep fallback. |
| N | Three-layer test model: `unit` / `integration` / `harness`. |
| O | Resume state in dedicated wisp, not bead notes (avoids h8sh 65 KB freeze). |
| P | Citation validator: literal grep + section-anchor scope (two-pass). |
| Q | Tracer T1 split into T1a (infra) + T1b (calibration). |
| R | Tracer T2 / T5 split per natural seams (T2a/T2b, T5a/T5b/T5c). |
| S | RED tests for behavior-bearing CLI flags. |
| T | Doc-reader spawn predicate (broadened by AJ). |
| U | Repo-versioned skill installation (`<repo>/.claude/skills/`). |
| V | Citation validator runs at consolidator stage, not agent self-call. |
| W | Per-angle bug seeding in T3 + static-lint for INPUT_WISPS. |
| X | Section-aware hedging detector. |
| Y | Bead validation at Phase 0 — superseded by AG (LLM grader, not regex). |
| Z | Mode decision logged + embedding model pinned (refined by AD). |
| AA | RED-3 always-required sections + NONE universal exception. |
| AB | RED test for `verified_at` SHA drift detection. |

### Iteration 3 (fused workflow — second-order amendment churn)

| ID | Topic |
|----|-------|
| AC | Resume-wisp ID format flipped to `<bead-id>-wisp-resume` (purge-glob match). |
| AD | Embedding model + threshold + call-site pinned for FM-4 dedup. |
| AE | T1a absorbs harness scaffolding (`runner.sh`, fixtures, `package.json` script). |
| AF | Harness CI provisioning plan (`RUN_HARNESS=local|ci|skip`). |
| AG | Bead validation via LLM grader, not regex. |
| AH | Harness tests use ephemeral `/tmp` repo fixtures. |
| AI | `--blocker-bypass-threshold` covered in T5c. |
| AJ | Doc-reader spawn predicate broadened to any `*.md` reference. |
| AK | T1b complexity 8 → 6 (no architectural surface). |
| AL | `.claude/skills/` git-tracked (overrides historical `.claude/` ignore). |

### Iteration 4 (CONVERGED — polish residue)

| ID | Topic |
|----|-------|
| AM | LLM grader pins model (`claude-haiku-4-5-20251001`) + temperature 0. |
| AN | Default `RUN_HARNESS` value stated (`local`). |
| AO | LLM grader prompt pinned to source path (`validators/bead_grader.md`). |
| AP | Periodic `/tmp` GC sweep for harness fixtures (>24h old). |

### Amendment AQ (severity calibration)

| ID | Topic |
|----|-------|
| AQ | Workaround-exists test mandatory before BLOCKER classification; hardcoded few-shot examples in every inspector prompt. |

## Tracer sequence (T1a → T5c)

The 9 tracers are sequential; each lands as its own RED+GREEN bead pair under
parent `numanac-web-t6ao`.

| Tracer | Complexity | Owns |
|--------|-----------:|------|
| T1a | 5 | SKILL.md skeleton, parsers (importance/hedging), validators (citation/bead_grader), severity-rubric, runner.sh, harness scaffolding |
| T1b | 6 | `calibration/importance-examples.md` (5–8 examples per band drawn from prior PR docs / CR triage outputs) |
| T2a | 6 | R0 spec drafter (greenfield branch) + hedging mechanical check + no-7s mechanical check + opt-out audit re-prompt |
| T2b | 6 | R0 spec drafter (refactor branch via LSP-with-fallback) + citation_validator refactor branch |
| T3 | 8 | 4 R1 inspectors (correctness / completeness / feasibility / conventions) + per-angle bug seeding |
| T4 | 8 | Consolidator + bucket A/B/C classification + dedup (embedDedup Convex action) |
| T5a | 6 | Doc-reader agent + conditional spawn predicate |
| T5b | 8 | Multi-bead + `--epic` + `--assembly=isolated/unified` + `--re-perfect` versioned amendments |
| T5c | 6 | Bypass paths + tracer-bullet output schema + resume protocol |

## Glossary

- **Bucket A** — auto-applied fix, no user input.
- **Bucket B** — downgraded finding, recorded but not blocking.
- **Bucket C** — surfaced to user; blocks READY_FOR_IMPL until answered.
- **Tracer bullet** — a thin end-to-end vertical slice with its own RED+GREEN
  cycle. Default decomposition shape post-iter-1 amendment.
- **Wisp** — ephemeral or permanent bead used as the data plane between agents.
- **R0 / R1** — first / second round of spec generation: drafter / inspectors.

## Pointers

- Authoritative spec: [`docs/design/spec-perfection.md`](../../../docs/design/spec-perfection.md)
- Companion skill (TDD execution): [`docs/design/tdd-multi-agent-v1.1.md`](../../../docs/design/tdd-multi-agent-v1.1.md)
- Implementation tracker bead: `numanac-web-t6ao`
- Iteration finding beads: `numanac-web-t6ao.1` … `.4`
