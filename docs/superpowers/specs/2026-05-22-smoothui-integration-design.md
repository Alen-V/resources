# SmoothUI Integration — Design

**Date:** 2026-05-22
**Status:** Approved, ready for implementation
**Scope:** Wire-up only (no curated component set, no shared package extraction)

## Goal

Make `npx shadcn@latest add @smoothui/<name>` work out of the box for anyone using this monorepo template, with one verified working component as a smoke test on the existing `/preview` page.

## Context

- `apps/web` is Next.js 16 + React 19 + Tailwind v4, with shadcn/ui fully initialized (`cn` util at `src/lib/utils.ts`, standard shadcn components in `src/components/ui/`, `components.json` correctly pointed at `src/app/globals.css`).
- A `/preview` route (`src/app/preview/page.tsx`) renders every shadcn component via a `sections` array — natural place to demo new additions.
- SmoothUI is an official shadcn registry. No `components.json` change is required — the `@smoothui/` namespace works directly. Source: <https://smoothui.dev/docs/guides/installation>.
- SmoothUI's only universal peer dep is `motion` (the Framer Motion successor). A subset of components additionally use `gsap`; those install `gsap` on demand when added.

## Changes

1. **Add `motion` dep** to `apps/web`:

    ```bash
    pnpm --filter web add motion
    ```

2. **Install one smoke-test SmoothUI component** (siri-orb — visually distinctive, motion-only, no props required, no GSAP). Run from `apps/web/`:

    ```bash
    pnpm dlx shadcn@latest add @smoothui/siri-orb --yes
    ```

    Lands at `apps/web/src/components/smoothui/siri-orb/index.tsx` (folder-per-component, not a flat `ui/` dir). Namespaced separate from shadcn's `ui/` directory — no collision risk.

    **Gotcha:** SmoothUI registry components import `cn` via `@repo/shadcn-ui/lib/utils` — a stable alias the registry uses for cross-project portability. To avoid rewriting imports per install, add a path alias in `apps/web/tsconfig.json`:

    ```json
    "paths": {
      "@/*": ["./src/*"],
      "@repo/shadcn-ui/*": ["./src/*"]
    }
    ```

3. **Add a `smoothui-siri-orb` section** to the existing `sections` array in `src/app/preview/page.tsx`, following the established `id`/`label`/`render` pattern. One `Variant` block rendering `<SiriOrb />`.

4. **Update `apps/web/README.md`** with a short "Adding components" section noting:
    - shadcn components: `pnpm dlx shadcn@latest add <name>`
    - SmoothUI components: `pnpm dlx shadcn@latest add @smoothui/<name>` — lands under `src/components/smoothui/ui/`
    - Motion is already installed; GSAP installs on demand if a component needs it

## Out of Scope

- Pulling in a curated set of SmoothUI components — devs use the CLI on demand.
- Extracting `src/components` into a shared `packages/ui` — premature for a single-web-app template.
- Cleaning up the empty top-level `apps/web/components/`, `lib/`, `styles/` placeholder dirs (cruft from before the `src/` migration). Worth doing separately.
- iOS/Android: SmoothUI is React-only, so they're unaffected.

## Risks & Mitigations

- **Next.js 16 + Motion client component requirement.** SmoothUI components emit `"use client"` directives. Failure mode is loud (hydration error visible on `/preview`) — easy to catch in the verification step.
- **`siri-orb` registry name changes.** Low risk — it's been a flagship SmoothUI component since launch. If it ever 404s, swap in another motion-only smoothui component (e.g. `infinite-slider`).

## Verification

- `pnpm --filter web typecheck` passes ✓
- `pnpm --filter web lint` adds no new errors (pre-existing error in `app-shell.tsx:254` is unrelated) ✓
- `pnpm dev` boots; `GET /preview` returns 200 in ~274ms; the `smoothui-siri-orb` section renders in the HTML; no compile errors in the dev log ✓

## Rollback

Single commit. `git revert` is sufficient — undoes the dep, the installed component, the preview entry, and the README update.
