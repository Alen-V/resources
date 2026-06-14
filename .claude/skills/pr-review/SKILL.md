---
name: pr-review
description: Review the current PR with a fleet of parallel read-only inspector subagents. Hardens the linked bead's spec via spec-perfect first, then dispatches inspectors across Convex, Swift/SwiftUI, React/TypeScript, cleanliness, correctness, security, and spec-adherence lenses, then files findings as wisp beads tagged to the PR. Use this skill whenever the user asks to review a PR, inspect a PR, find flaws or issues in the current PR, run inspectors on a PR, or anything else that resembles a systematic PR-level code review — even when they don't explicitly say "review." This is a top-level orchestrator and cannot be invoked from inside a subagent (it must spawn its own subagents and call spec-perfect, both of which require main-thread context).
---

# pr-review

Multi-lens, read-only PR review. Inspectors are read-only — no source edits, no writes, no mutating commands. The orchestrator (main thread) is allowed to write beads at the end. That is the only write path.

## Orient (main thread, once)

1. **Identify the PR.** Run `gh pr view --json number,title,headRefName,baseRefName,files`. If `gh` returns nothing or you're not on a PR branch, stop and ask which PR before spawning anything.

2. **Fetch shared context.**
   - `gh pr diff` for the full changeset
   - `gh pr view --comments` so inspectors don't repeat human review feedback
   - Read `CLAUDE.md` (root + any nested ones in changed directories)

3. **Learn the local bead conventions.**
   - `bd prime` for workflow + command guidance
   - `bd list --json` for open beads, so findings already captured aren't refiled

4. **Harden the spec.** Identify the source bead this PR implements — check the branch name (often `bd-XXXX-…`), PR title/body, and recent commit messages. Then run `spec-perfect <bead-id>` from the main thread (it's top-level only and cannot be invoked from a subagent). Capture:
   - The resulting spec wisp ID — ground truth for what the PR should do
   - Bucket A (auto-applied fixes) — already resolved, just note them
   - Bucket B (informational) — pass to inspectors as context
   - Bucket C (needs user adjudication) — surface in the final chat output, do not file as review findings

   If no source bead is identifiable, skip spec-perfect and note "no linked bead — spec adherence lens will operate from PR description only."

5. **Pick lenses.** From the changed-file list and hardened spec wisp, decide which lenses apply. Skip lenses with zero matching files.

## Dispatch

Spawn the applicable inspectors in parallel. Prefer the built-in `Explore` subagent (read-only by design, Haiku-fast). If defining inline subagents, restrict tools to `Read, Grep, Glob, WebFetch` plus read-only `Bash` for `git` / `gh` / `bd <read commands>`, and set `permissionMode: plan`.

Inspectors must not use: `Edit`, `Write`, `MultiEdit`, `NotebookEdit`, any state-changing shell, `bd create` / `bd update` / `bd close`, or `spec-perfect` (it's main-thread only).

Pass each inspector: the diff slice for its domain, the changed-file list, relevant `CLAUDE.md` excerpts, the spec wisp ID + Bucket B items from spec-perfect (or the PR description if no bead was linked), and the open-bead summary.

## Lenses (run only those that apply)

1. **Convex backend** (`convex/**`). Consult `docs.convex.dev` before any framework-specific efficiency claim — queries vs mutations vs actions, indexes, pagination, validators, auth, reactivity. Watch for: N+1 patterns, missing indexes on filtered/ordered fields, query/mutation/action misuse, unbounded queries without `paginationOpts`, unvalidated args, missing auth checks, reactive queries fetching more than the UI consumes.

2. **Swift / SwiftUI.** Consult `developer.apple.com` for the specific API before efficiency claims. Watch for: value vs reference semantics mistakes, retain cycles in closures (missing `[weak self]`), `@MainActor` correctness, structured concurrency misuse (unstructured `Task {}` where a group fits, missing cancellation), SwiftUI view-identity issues causing excess body recomputation, force-unwraps, leaking optionals.

3. **React / TypeScript.** Consult `react.dev` before efficiency claims. Watch for: unnecessary re-renders, wrong or missing hook dependency arrays, missing/unstable list keys, memoization that costs more than it saves, missing Suspense or error boundaries on async UI, prop drilling that wants context, dead state, types that lie about runtime shape.

4. **Cleanliness & modularity.** Module boundaries, dead code, duplicated logic, naming, file size, leaky abstractions across the Convex↔client seam.

5. **Correctness & edge cases.** Error handling, null/undefined paths, races across the client↔Convex boundary, missing loading/empty/error states, off-by-ones.

6. **Security & data.** Input validation on every Convex function, authz on every read and write, secret handling, PII in logs, client-trusted values used for authorization.

7. **Spec adherence** (cross-cutting, always run when a spec wisp exists). Does the implementation match the hardened spec wisp from step 4? Flag scope creep, missing acceptance criteria, behavior that contradicts intent. If no spec wisp, judge against the PR description and flag the absence.

## Inspector output contract

Findings as a flat list. Each finding:

- **severity**: blocker / major / minor / nit
- **file:line** (or file:range)
- **problem**: one sentence
- **why**: 1–3 sentences; for framework-specific efficiency claims, cite the doc URL the claim rests on
- **fix sketch**: prose, no patches
- **related_beads**: any existing bead IDs this overlaps with (from the open-bead summary), or empty

Skip nits unless they compound.

## Consolidate (main thread)

After all inspectors return:

- Dedupe overlapping findings, keep the clearest framing
- Normalize severity across inspectors (blocker is "merge-blocking," not "code smell I dislike")
- Note inspector disagreements rather than silently picking one — file the disagreement in the wisp body
- For each surviving finding, file a wisp (the ephemeral bead variant — use the syntax `bd prime` surfaced, or check `bd create --help` if unclear). Each wisp:
  - **title**: `[PR #<n>] <file>:<line> — <one-line problem>`
  - **type**: task (or whatever this project uses for review findings)
  - **priority**: blocker→0, major→1, minor→2, nit→3
  - **description**: problem, why (with doc URL if cited), fix sketch, inspector lens, PR ref, doc citations
  - **labels**: per-PR label (e.g. `review:pr-<n>`) plus lens label (`review:convex`, `review:swift`, `review:spec`, etc.)
- Link each filed wisp `discovered-from` the spec wisp (if one exists) so the review trail traces back to spec
- Link related findings with `bd dep add <new> <other> --type related` for shared root causes, and `--type discovered-from` if a finding traces back to an existing open bead

## Output in chat

Brief, in this order:

1. Spec wisp ID and a one-line summary of what spec-perfect Bucket A auto-fixed (or "no linked bead")
2. Bucket C items from spec-perfect — these need user adjudication, not review-finding wisps
3. Count of review findings by severity + list of wisp IDs filed
4. Any findings deliberately not filed (with reason)

No roll-up "top changes" summary — the wisps are the deliverable. The human can `bd ready` or filter by the PR label from there.
