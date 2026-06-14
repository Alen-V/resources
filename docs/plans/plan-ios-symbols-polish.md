# /ios-symbols — interaction polish (ui-ux pass)

## Goal

Make the SF Symbols browser _feel_ smooth — responsive typing, judder-free
scrolling, no content pop-in — and remove dead navigation. No visual redesign.

## Diagnosis (root causes of "not smooth")

Measured against the actual code, not guessed. The virtualization height/scroll
chain is already correct (`overflow-hidden`/`overflow-y-auto` force flex
min-size to 0), so the grid genuinely windows. The jank comes from:

1. **Typing runs the full filter synchronously.** `useSymbolFilters` memoizes
   `results` on the whole `state` object. `state` gets a new reference on every
   keystroke, so the 9,184-item `filterSymbols` pass + a full grid reconcile run
   on the _urgent_ render of every keystroke — `useDeferredValue` is bypassed.
2. **Glyphs pop in while scrolling.** `loading="lazy"` defers image fetch/decode
   until each `<img>` nears the viewport. Since virtualization already mounts
   only visible (+overscan) rows, lazy adds an IntersectionObserver per image
   and a visible empty-tile → glyph flash on scroll.
3. **Every visible cell re-renders on unrelated parent renders.** The copy
   handler `(s) => copy(s, copyFormat)` is a new function each render, so
   `React.memo(SymbolCell)` never hits — typing re-renders all visible cells.
4. **Minor:** cell Buttons inherit `transition-all` (animates every property);
   the grid initializes `columns = 1` and measures in `useEffect` (after paint),
   causing a 1→8 column flash on mount; the scroll area lacks
   `overscroll-contain` and a stable scrollbar gutter, so hitting the end chains
   to the page and result-count changes can shift width.

## Fixes (mapped to files)

- **`_hooks/use-symbol-filters.ts`** — defer the _whole_ filter input:
  `const deferredState = useDeferredValue(state)` and compute `results` from
  `deferredState` (+ `deferredState.query`). The toolbar keeps binding to the
  immediate `state` (instant UI feedback); the expensive filter runs at low
  priority. Compiler-proof (single deferred dependency).
- **`_components/symbol-browser.tsx`** — wrap the copy handler in `useCallback`
  keyed on `[copy, copyFormat]` so `React.memo(SymbolCell)` holds.
- **`_components/symbol-cell.tsx`** — drop `loading="lazy"`; add explicit
  `width`/`height` (decode scheduling + CLS, per web-platforms ref); narrow
  `transition-all` → `transition-colors`; `draggable={false}`.
- **`_components/symbol-grid.tsx`** — measure synchronously via an isomorphic
  layout effect (kills the column flash) ; add `overscroll-contain` +
  `scrollbar-gutter: stable`; bump overscan 6 → 8 so rows (and their now-eager
  images) are ready just before they scroll into view.
- **`components/app-shell.tsx`** — remove the dead `href:'#'` entries (Docs,
  Settings) from `overviewNav`. This clears the dead paths from the header (and
  the sidebar's Overview group, which renders the same list).

## States

Unchanged. Empty state (no results) and the dark-mode glyph tile (`bg-zinc-100`)
stay as-is. Reduced-motion: motion is now color-only + a 1px press translate from
the shared Button — within reason; no new global motion added.

## Components

- Reused: shadcn `Button`, `Input`, `Select`, `Popover`, `Command`, `Switch`,
  `ToggleGroup`, `Badge`, sidebar primitives. No new components.

## Platform & conventions

Web. Semantic `<button>`/`<nav>`/`<main>`; keyboard activation preserved; visible
focus ring (from Button); images carry `alt` + `width`/`height`; targets ≥24px;
WCAG 2.2 AA. Stays entirely within the shadcn/Tailwind token scale.

## Aesthetic direction

Match the existing codebase exactly — this is an interaction/performance pass,
not a visual one. For that reason the `frontend-design` build skill is **not**
invoked (it executes bold _visual_ direction; there's no visual change here).

## Constraints

A11y: WCAG 2.2 AA. Perf: keep typing INP < 200ms and scrolling ~60fps over the
full 9,184-symbol set. No new dependencies.

## Out of scope

Visual redesign; new features; the sidebar-only "Workspace" demo links (noted as
also dead, but not part of "the header"); commit/LFS decision.

## Open tradeoffs (resolved)

- Bold redesign vs. match conventions → **match** (user asked to fix smoothness,
  not restyle). So no `frontend-design` handoff.

## Implementation notes

Follow existing file conventions (route-colocated `_components`/`_hooks`/`_lib`,
`'use client'` on interactive units). Verify with `pnpm --filter web typecheck`,
`lint`, `build`, and the existing Vitest suite.
