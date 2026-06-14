# Importance Scale — Calibration Corpus

Drawn from this codebase's prior decision history. Examples are real decisions
preserved (verbatim or close to it) so R0's importance ratings anchor on
stable references rather than per-run vibe. Conventions inspector (T3) audits
band coverage and source authenticity at iteration time; the unit test at
`tests/skills/spec-perfect/calibration-examples.test.ts` enforces structural
shape per-commit.

The "no 7s" rule (OQ-4) is a forcing function: decisions that feel like 7
must commit to 6 (auto-decide) or 8 (escalate at default threshold).

## Band 1–2 (trivial)

### Rename private type `FieldLabelImageContent` → `ResourceLabelImageContent`

- decision: rename a private SwiftUI helper so its name matches the file it lives in (`ResourceLabelTooltip.swift`).
- source: docs/PR_docs/710-pr-704-cr-round-1-fixes.md
- rationale: pure naming hygiene, no behavior change, no public API surface — textbook 1.

### `WindowHelpers.width` `0` → `280` fallback (clamp adjustment)

- decision: replace a literal `0` fallback with `280` to match the docstring's "floored at 280pt" claim, then add a `max(280, width)` clamp.
- source: docs/PR_docs/710-pr-704-cr-round-1-fixes.md
- rationale: doc/code consistency on a fallback constant; one-line, mechanically obvious.

### CR wording polish: "works by accident" → "works incidentally"

- decision: swap two phrases in the PR decision log for tone; also "which is exactly what we want" → "which is what we want".
- source: docs/PR_docs/717-sign-in-url-encode-invitation-id.md
- rationale: prose nitpick on a decision log, not on shipped behavior — 1.

### MD038 nested-backticks fix in PR doc

- decision: upgrade outer single backticks to double inside a code span to satisfy markdownlint MD038.
- source: docs/PR_docs/720-crm-acreage-rollups.md
- rationale: lint nit on a doc; complexity 1 per the triage table.

### Replace stale "Yesterday/Today" with absolute dates

- decision: swap relative dates for "Apr 20 → Apr 21 (2026)" in a PR doc so they don't age poorly.
- source: docs/PR_docs/711-fix-recurring-task-cancel.md
- rationale: prose-level edit; future-proofing without behavior or interface change.

## Band 3–4 (low)

### Use `encodeURIComponent`, not `encodeURI`

- decision: encode a single query value with `encodeURIComponent` rather than `encodeURI` because the latter leaves `&`/`=`/`#`/`?` unescaped.
- source: docs/PR_docs/717-sign-in-url-encode-invitation-id.md
- rationale: helper-choice between two builtins with a defined-but-narrow correctness gap; reasoned out, not load-bearing on architecture.

### String concat + `?`/`&` check vs `new URL().searchParams.set()`

- decision: append the query param via plain concat and a `?` test, not by constructing a `URL` object.
- source: docs/PR_docs/717-sign-in-url-encode-invitation-id.md
- rationale: pick among interchangeable utilities; chosen on style consistency with the surrounding helper, not on correctness.

### Tightened `nonAutoClients.length === 0` → exact-count + name check

- decision: strengthen a count assertion to also verify the workstation's name in two backend tests.
- source: docs/PR_docs/710-pr-704-cr-round-1-fixes.md
- rationale: test-precision improvement; widens signal but doesn't redefine behavior.

### Echo "skipping iOS simulator build" when `SKIP_IOS_CHECK=1`

- decision: print a visible message when the env var is set, rather than silently skipping the iOS step.
- source: docs/PR_docs/689-skip-ios-check.md
- rationale: small UX choice on a hook — observability vs silence — with low blast radius.

### Empty-boundaries: throw, not return null

- decision: surface `boundaries.length === 0` as a `ConvexError` rather than coalescing to null.
- source: docs/PR_docs/722-field-boundary-legacy-backcompat.md
- rationale: error-shape choice between two well-defined options, anchored on existing pre-636 invariant; bounded blast radius.

## Band 5–6 (medium)

### Union-of-statuses index queries instead of `.collect() + JS filter`

- decision: replace a `.collect()`-then-filter with a union of three `.withIndex(by_organization_id_status, status=...)` queries.
- source: docs/PR_docs/701-invitation-lifecycle.md
- rationale: index-usage / query-shape decision under a known O(history) hazard; medium-impact perf pattern, no schema change.

### `getLatestAcreagePerOrganization` returns rows, not a scalar

- decision: have the new DAL return `OrganizationAcreageRow[]` so admin UI can sort/filter, mirroring `getLatestAlmanacDepthScoreByOrg`.
- source: docs/PR_docs/720-crm-acreage-rollups.md
- rationale: shape of a public DAL helper; precedent-driven, downstream-shaping but reversible.

### `clearRecurrence` as a dedicated mutation, not an `updateTask` field

- decision: model "user clicked No Repeat" as a new `clearRecurrence({task_id, organization_id})` mutation rather than overloading `updateTaskArgs`.
- source: docs/PR_docs/711-fix-recurring-task-cancel.md
- rationale: which Convex mutation type / surface to use — clean separation but not architectural; touches a single subsystem.

### Two-branch optional-filter pattern in `lfa9` (stylistic)

- decision: keep two branches for the optional `organizationId` filter rather than collapsing into a composed `sql\`\`` template, even though composition is supported.
- source: docs/PR_docs/720-crm-acreage-rollups.md
- rationale: explicit "stylistic" call between two interchangeable patterns; bounded to a single helper.

### `SUM(COALESCE(acres, 0))` everywhere (defensive sum form)

- decision: use `SUM(COALESCE(acres, 0))` even though the column is currently never NULL, breaking from `getLatestTotalAcreage`'s plain `SUM(acres)`.
- source: docs/PR_docs/720-crm-acreage-rollups.md
- rationale: SQL pattern choice with mild defense-in-depth tradeoff; locked once but non-architectural.

### Hook warns, never blocks (PR doc reminder hook)

- decision: a missing `docs/PR_docs/<n>-<slug>.md` triggers a stderr warning on push, not an exit-1 block.
- source: docs/PR_docs/692-agents-md-subagent-rules.md
- rationale: enforcement-style call between "block contrived workarounds" and "let signal-to-noise ratio do the work"; pattern-level, not architecture.

### Atomic temp-file + rename wrapper around `bd export -o`

- decision: `mv -f` from a `${OURS}.merge-driver.XXXXXX` into the destination so a ctrl-C mid-export can't leave a truncated `.beads/issues.jsonl`.
- source: docs/PR_docs/721-beads-jsonl-merge-driver.md
- rationale: implementation pattern protecting one syscall sequence; medium-impact correctness for one merge driver, not cross-cutting.

## Band 8 (architectural)

### Ten parallel perspective agents, not one sequential interviewer

- decision: spec-oracle dispatches 10 single-angle agents in parallel rather than one omnibus interrogator.
- source: docs/PR_docs/690-spec-oracle-skill.md
- rationale: defines the skill's whole operating shape; downstream agents and orchestrators have to know how the skill produces its output.

### "The doc IS the state" — no separate session store

- decision: spec-oracle overwrites `docs/specs/<slug>-<reviewer>.md` after every answered batch and treats it as the single source of truth (no DB, no beads field, no session file).
- source: docs/PR_docs/690-spec-oracle-skill.md
- rationale: foundational architectural pick between embedded and external state; touches resume, sharing, and review semantics for every spec the skill ever produces.

### Three-layer response vocabulary (`defer` / `dev|devteam` / name)

- decision: every Q&A interaction in spec-oracle uses one of three tagged response shapes, not a freeform answer.
- source: docs/PR_docs/690-spec-oracle-skill.md
- rationale: public-API decision for every reviewer interaction; defines downstream automation surface (per-name worklists, defer provenance).

### `clearRecurrence` is the public mutation surface, not an `updateTask` field

- decision: keep recurrence-clear as its own mutation rather than letting `updateTask` grow recurrence semantics under `change_targets`.
- source: docs/PR_docs/711-fix-recurring-task-cancel.md
- rationale: long-lived public-API split that avoids overloading a heavily-used mutation; future "change cadence" sits next to it cleanly.

### Soft-delete invitations + atomic index swap (`by_organization_id` → `by_organization_id_status`)

- decision: switch revoke from `ctx.db.delete` to a `status='revoked'` patch and atomically rename the index in the same PR.
- source: docs/PR_docs/701-invitation-lifecycle.md
- rationale: lifecycle/schema-shape change that ripples across queries, perms cascade, CRM metrics, and read-amplification — but contained to one table.

### `createFreeOrganization` becomes the single org-bootstrap entry point

- decision: have `workOSRegistration` delegate to `createFreeOrganization`, which atomically creates the default workstation client + resource_node.
- source: docs/PR_docs/644-auto-create-workstation.md
- rationale: dispatch-model decision (one canonical creation path vs two-platform implementations); load-bearing for every signup path.

### CLAUDE.md is canonical; AGENTS.md is a derived checklist

- decision: AGENTS.md explicitly states "When this file and CLAUDE.md disagree, CLAUDE.md wins; file a bead to reconcile."
- source: docs/PR_docs/692-agents-md-subagent-rules.md
- rationale: governance/source-of-truth call that defines how every contributor (and every future skill) treats the two files; subtle but binding.

## Band 9–10 (cross-cutting)

### Runtime `withLegacyBoundary` projection on every field-returning query (App Store iOS decode contract)

- decision: project a derived `boundary` key onto every field-returning query response via `withLegacyBoundary`, codified as a mandatory rule in CLAUDE.md.
- source: docs/PR_docs/722-field-boundary-legacy-backcompat.md
- rationale: breaking the projection crashes the released App Store iOS build on next launch — affects an external client contract we can't iterate on.

### CRM `synced_at` hour-truncation guard across 28 sync functions

- decision: require `hourTruncatedTimestamp()` (JS) or `date_trunc('hour', timezone('UTC', NOW()))` (SQL) on every CRM Neon write, enforced via `scripts/check-crm-synced-at.sh` at commit + push.
- source: CLAUDE.md
- rationale: the original bug silently turned `ON CONFLICT DO NOTHING` into a no-op across all CRM syncs; the guard is cross-cutting and protects every sync function.

### TDD Rule — every implementation bead needs a TDD bead that blocks it

- decision: enforce RED-before-GREEN for all code changes (schema is the only exception), with a separate TDD bead blocking each implementation bead.
- source: CLAUDE.md
- rationale: governs every contributor's workflow, every PR, every subagent — definitionally cross-cutting.

### `field_acreage.created_by` ALTER + pre-merge Neon MCP execution (CRM exception path)

- decision: add a nullable `created_by TEXT` column to the existing `field_acreage` Neon table (CRM exception path), execute the ALTER on prod + dev branches before merge to close the 24h rollout window.
- source: docs/PR_docs/720-crm-acreage-rollups.md
- rationale: schema change to a shared CRM table with a hard rollout window; required user approval per the CLAUDE.md exception path; touches multiple sync functions and read paths.

### `boundaries[]` archive array as new field-storage shape (PR 636)

- decision: introduce `boundaries: [...]` as the storage-shape source of truth for field geometry, removing `boundary` (singular) from the storage shape.
- source: docs/PR_docs/722-field-boundary-legacy-backcompat.md
- rationale: cross-workspace schema change that broke the released App Store iOS decode contract — exactly the kind of decision that 9–10 ratings exist for.

### Move `Subagent Rules (MANDATORY)` block to top of AGENTS.md

- decision: place mandatory subagent rules as the first H2 in AGENTS.md so they survive auto-compaction's first-N-tokens cutoff.
- source: docs/PR_docs/693-agents-md-v2.md
- rationale: governs prompt-context survival across every subagent invocation in the repo — a workflow primitive every future skill depends on.
