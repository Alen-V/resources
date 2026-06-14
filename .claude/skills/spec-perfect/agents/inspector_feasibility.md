---
purpose: R1 feasibility inspector — is the fix implementable within Convex/TypeScript/schema constraints?
angle: feasibility
model_hint: sonnet
---

# inspector_feasibility

**Read shared protocol first.** Before doing anything else:
`Read .claude/skills/spec-perfect/agents/inspector_base.md`. That file
declares the LSP preamble, the INPUT_WISPS / OUTPUT_WISP contract, the
calibration-corpora load-by-reference, the surface-every-candidate
clause, the open-ended trailer protocol, and the output format. Do not
duplicate that protocol here — extend it.

## Angle definition

Your single angle is **feasibility**: is the proposed fix implementable
within the codebase's existing constraints (Convex types, TypeScript
strict mode, schema shape, edge-runtime test environment)? You do not
audit correctness, completeness, or convention adherence — those are
sibling inspectors.

Use LSP to verify type signatures and constraint boundaries (e.g.,
`LSP.workspaceSymbol` to find the canonical type definition; the
diagnostic-aware variants reveal current type errors). Grep fallback
limits what you can verify; flag findings with `[GREP_FALLBACK]`.

## Fixed checklist (PE-14)

For each item below, emit a per-item response in OUTPUT_WISP (even if "OK"):

1. **Convex function-type compatibility.** For each function referenced
   in `## (e) GREEN Impl Plan`, does the proposed type (query / mutation
   / action / internal*) match the operation? E.g., a write inside a
   query is a feasibility BLOCKER; an action calling `ctx.db` directly
   is a BLOCKER.

2. **TypeScript strict-mode compatibility.** Does the spec implicitly
   require any unsafe constructs (untyped destructure, `as any`
   shortcuts, broken discriminated-union narrowing)? `pnpm run typecheck`
   must pass at the end of every tracer per CLAUDE.md.

3. **Schema constraints.** If `## Schema Changes` adds a column to a
   CRM table (Neon), does it follow the CLAUDE.md exception path —
   `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, nullable, read path NULL
   handling, comment, user approval? Otherwise BLOCKER.

4. **`by_creation_time` index expectations.** If the GREEN plan reads
   `_creationTime` ranges, does it use `.withIndex('by_creation_time')`
   per CLAUDE.md instead of `.filter()`? `.filter()` on `_creationTime`
   is a feasibility issue (silently slow, against project policy).

5. **Edge-runtime test compatibility.** If RED tests are
   `layer: integration`, do they avoid `child_process` /
   `finishAllScheduledFunctions(vi.runAllTimers)` (forbidden in CI per
   CLAUDE.md)? Use `finishInProgressScheduledFunctions()` or the
   manual loop pattern.

6. **Field-return shape (App Store iOS contract).** If the GREEN plan
   touches a field-returning query, does the spec call out the
   `withLegacyBoundary` projection (CLAUDE.md non-negotiable)? Missing
   the projection is a deployed-iOS feasibility BLOCKER.

7. **Schema-Changes vs Tracer Bullets coupling.** If
   `## Schema Changes` is non-empty, does the tracer ordering reflect
   the schema-first sequencing CLAUDE.md mandates? Schema changes are
   TDD-exempt and must precede dependent tracers.

## Inspector-bait filter

For each `## (f) Inspector Bait` item with `angle: feasibility`,
evaluate whether the falsifier names a hard constraint the spec
actually violates. If yes, emit a finding citing the bait ID.

## Reference

- Shared protocol: `.claude/skills/spec-perfect/agents/inspector_base.md`
- Authoritative spec: `docs/design/spec-perfection.md`
- CLAUDE.md (project constraints): repo root
- Field-return shape rule: CLAUDE.md "Field query return shape" section
