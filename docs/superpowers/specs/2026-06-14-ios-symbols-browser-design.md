# `/ios-symbols` — SF Symbols browser (design spec)

- **Date:** 2026-06-14
- **Status:** Approved design — ready for implementation planning
- **Scope:** A single web route in `apps/web` that lets a user browse, search, filter, and copy all SF Symbol PNGs added to `packages/icons/`.

## 1. Goal

Provide a fast, web-facing UI at **`/ios-symbols`** for browsing the 9,184 SF
Symbol PNGs in `packages/icons/`, with:

- **Search** — live, debounced, by symbol name.
- **Filter** — by Apple's official **categories** _and_ filename-derived
  **facets** (fill / circle / square / slash / badge / rtl / numbered), plus a
  **localized** toggle.
- **Copy** — a global **copy-format selector**; whatever format is selected is
  what every symbol click copies.
- **Grid** — a virtualized responsive grid.

## 2. Context & constraints

- Monorepo (`apps/web` Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui
  installed). iOS/Android apps are out of scope.
- Source assets: `packages/icons/*.png` — 9,184 files, 128×128, flat. This is
  the canonical symbol list. **7,945 base + 1,239 localized** variants.
- No category metadata exists in the repo, **but** Apple's `SF Symbols.app` is
  installed locally at `/Applications/SF Symbols.app/Contents/Resources/Metadata/`,
  providing official data we extract once at authoring time:
    - `symbol_categories.plist` — symbol → category keys (7,761 mapped, multi-category)
    - `categories.plist` — 32 category keys → labels
    - `name_availability.plist` — first OS version per symbol (optional `since`)
- Next.js serves static files only from `public/`.

## 3. Non-goals (YAGNI)

Per-symbol detail page; SVG/vector export (we only have PNG); icon font / sprite
atlas; recoloring/editing; favorites/persistence; auth; server DB; ⌘K command
palette; arrow-key grid navigation; Apple keyword/alias search enrichment. The
last three are noted as possible fast-follows but are **not** in v1.

## 4. Architecture overview

Two halves: an **authoring-time build pipeline** (produces committed data +
serves PNGs) and a **runtime UI** (a client island under a server route).

```
packages/icons/*.png ──┐
                       ├─(symbols:meta, macOS only, rare)→ apps/web/src/data/ios-symbols/{manifest,categories,languages}.json  (COMMITTED)
SF Symbols.app plists ─┘
packages/icons/*.png ───(symbols:sync, predev/prebuild, any OS)→ apps/web/public/ios-symbols/*.png  (GITIGNORED, generated)

app/ios-symbols/page.tsx (server: imports manifest)
   └─ <SymbolBrowser> (client: owns filter + copy-format state)
        ├─ <SymbolToolbar>  search · copy-format · categories · facets · localized · count
        └─ <SymbolGrid>     virtualized → <SymbolCell> (img + name, click=copy)
```

## 5. Build pipeline

### 5a. `symbols:meta` — generate committed data (macOS-only, run rarely)

Script: `packages/icons/scripts/build-manifest.mjs`. Run manually whenever the
PNG set changes. Steps:

1. List `packages/icons/*.png` → canonical names (strip `.png`).
2. Convert the three plists to JSON via `plutil -convert json -o - <file>`.
3. For each symbol name, derive **facets** and **localization** from the
   filename (rules in §8), and look up **categories** (localized variants
   inherit their base name's categories when not directly mapped).
4. Emit **committed** artifacts under `apps/web/src/data/ios-symbols/`:
    - `manifest.json` — array of entries (schema in §6)
    - `categories.json` — `[{ key, label }]`, the 27 browseable categories in display order (meta categories `all`/`whatsnew`/`draw`/`variable`/`multicolor` excluded), plus `uncategorized` if any symbol is unmapped
    - `languages.json` — `{ code: label }` for localized variants (e.g. `ar→Arabic`)

Committing these decouples the web build from `plutil`/macOS — **CI and Vercel
never run this script**.

### 5b. `symbols:sync` — copy PNGs into `public/` (any OS, every build)

Script: `apps/web/scripts/sync-symbols.mjs`, invoked by a root `symbols:sync`
npm script. Idempotent copy of
`packages/icons/*.png → apps/web/public/ios-symbols/`. Wired into the existing
`predev`/`prebuild` chain alongside `tokens:build`. The output dir is
**gitignored** so we never double-commit 37 MB.

### 5c. Wiring

- Root `package.json`: add `"symbols:meta"` and `"symbols:sync"` scripts; extend
  `predev`/`prebuild` to run `symbols:sync` after `tokens:build`.
- `.gitignore`: add `apps/web/public/ios-symbols/`.

## 6. Data model — manifest schema

One entry per symbol (readable keys; generator MAY minify keys later):

```jsonc
{
    "name": "08.square.hi", // full symbol name, no extension; also the PNG basename
    "localized": true, // true if a language-suffixed variant
    "lang": "hi", // language code when localized, else omitted/null
    "facets": ["square", "numbered"], // subset of: fill circle square slash badge rtl numbered
    "categories": ["indices"], // browseable category keys (may be empty → "uncategorized")
    "since": "16.0", // optional, first OS version
}
```

Estimated payload: ~9k entries, lean JSON ≈ 100–150 KB gzipped — acceptable as a
one-time RSC payload. If it grows, split base/localized or lazy-load. The web app
treats `facets`/`categories` as **data**; it never re-derives them at runtime.

## 7. Serving (Approach A, confirmed)

PNGs are served as plain static files from `apps/web/public/ios-symbols/`,
referenced as `<img src="/ios-symbols/{name}.png">`. Use a native
`<img loading="lazy" decoding="async">` — **not** `next/image` (optimizing 9,184
tiny PNGs is pointless and would hammer the image optimizer).

## 8. Facet & localization derivation rules

Operate on dot-delimited segments: `segments = name.split(".")`.

- **localized / lang:** `true` when the last segment is in the known language set
  `{ar, he, hi, ja, ko, zh, th, bn, gu, kn, ml, mr, or, pa, sat, mni, ta, te, el}`
  **and** the name with that suffix removed also exists in the symbol set (guards
  against false positives). `lang` = that segment.
- **facets** (a facet is present when its token ∈ `segments`): `fill`, `circle`,
  `square`, `slash`, `badge`, `rtl`. Plus **`numbered`**: `name` matches `/^\d/`.

These rules live only in the generator; they are tested against the generator's
output (§12), and the runtime consumes the precomputed `facets`.

## 9. Filter & search semantics

State (owned by `<SymbolBrowser>` via `useSymbolFilters`):

- `query: string` — debounced ~150 ms; matches `name` via case-insensitive
  substring/token match. (Apple keyword/alias enrichment is a fast-follow.)
- `categories: Set<string>` — symbol matches if it has **any** selected category (OR).
- `facets: Set<Facet>` — symbol must have **all** selected facets (AND).
- `showLocalized: boolean` — default **false**: only the 7,945 base symbols show.
  When true, the 1,239 localized variants are included and a **language**
  sub-filter (from `languages.json`) appears.

Composition: `query AND categories(OR within) AND facets(AND) AND localizationVisibility`.
The hook returns `results` (filtered array) and `counts` (total / filtered), all
memoized.

## 10. Copy formats

A toolbar **copy-format selector** sets the active format; clicking any cell
copies in that format and fires a `sonner` toast. Formats (default = **Name**):

| Format       | Clipboard payload                        |
| ------------ | ---------------------------------------- |
| Name         | `house.fill`                             |
| SwiftUI      | `Image(systemName: "house.fill")`        |
| UIKit        | `UIImage(systemName: "house.fill")`      |
| Filename     | `house.fill.png`                         |
| PNG image    | the 128×128 PNG as a clipboard image     |
| Download PNG | triggers a file download (not clipboard) |

Mechanics (`useCopySymbol` + pure `lib/symbol-format.ts`):

- Text formats → `navigator.clipboard.writeText(...)`.
- PNG → `fetch('/ios-symbols/{name}.png')` → blob → `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`.
- **Fallbacks:** if the Clipboard API is unavailable/denied → error toast. If PNG
  `ClipboardItem` is unsupported (Firefox) → the PNG option is disabled with a
  tooltip, or falls back to copying the name with a notice.

## 11. Rendering & virtualization

- `<SymbolGrid>` virtualizes with **`@tanstack/react-virtual`** (new dependency):
  measure container width via `ResizeObserver` → `columns = floor(width / cellMin)`
  → virtualize **rows** (`ceil(results.length / columns)`), each row renders
  `columns` cells, small overscan. Re-measure on resize and when `results.length`
  changes. Sticky toolbar sits above the scroll container.
- `<SymbolCell>` is a focusable `button`: `<img alt={name}>` + truncated name;
  click/Enter/Space → `onCopy(symbol)`. Tooltip shows full name (+ `since`).

## 12. Testing

- `symbol-format.test` — `formatSymbol(name, format)` returns the exact string per
  format (table-driven).
- `derive-facets.test` (generator) — representative names:
  `house.fill→[fill]`; `08.square.hi→[square,numbered]`, localized `hi`;
  `bell.slash.circle.fill→[slash,circle,fill]`; a name ending in a lang token but
  with no base → **not** localized.
- `use-symbol-filters.test` — query/category/facet/localized composition + counts
  on a small fixture.
- `use-copy-symbol.test` — mocked `navigator.clipboard`: text formats call
  `writeText` with expected payloads; PNG path builds a `ClipboardItem`; failure
  path surfaces an error.
- Component — toolbar interactions change the visible result count; cell click
  invokes `onCopy` with the active format.
- Generator — runs against a small fixture dir; asserts manifest shape and that
  **every** manifest `name` has a backing file.

If the web app has no test runner configured, add **Vitest** (small, standard).

## 13. Accessibility & theming

- Cells are real buttons; `img` has `alt`; toolbar controls are labeled; the copy
  toast is announced. Respect `prefers-reduced-motion`. Arrow-key grid navigation
  is a fast-follow.
- **Dark-mode risk:** the PNGs are (almost certainly) black glyphs on transparent.
  On a dark background they'd vanish. Mitigation: render each cell on a fixed
  neutral surface (card background) that guarantees contrast in both themes, or
  apply `filter: invert()` in dark mode. **Verify the PNG color/alpha during
  implementation** and pick one.

## 14. Edge cases

- Manifest is generated **from** the file list, so every entry always has a PNG —
  no missing-image case.
- Empty results → friendly empty state with a "clear filters" action.
- `uncategorized` bucket only shown if non-empty.
- Clipboard permission denied / unsupported → handled per §10.

## 15. File layout (new/changed)

```
packages/icons/scripts/build-manifest.mjs        # symbols:meta (macOS)
apps/web/scripts/sync-symbols.mjs                # symbols:sync (any OS)
apps/web/src/data/ios-symbols/manifest.json      # committed
apps/web/src/data/ios-symbols/categories.json    # committed
apps/web/src/data/ios-symbols/languages.json     # committed
apps/web/src/app/ios-symbols/page.tsx            # server route
apps/web/src/app/ios-symbols/_components/symbol-browser.tsx
apps/web/src/app/ios-symbols/_components/symbol-toolbar.tsx
apps/web/src/app/ios-symbols/_components/symbol-grid.tsx
apps/web/src/app/ios-symbols/_components/symbol-cell.tsx
apps/web/src/app/ios-symbols/_hooks/use-symbol-filters.ts
apps/web/src/app/ios-symbols/_hooks/use-copy-symbol.ts
apps/web/src/app/ios-symbols/_lib/symbol-format.ts
apps/web/src/app/ios-symbols/_lib/types.ts
package.json (.gitignore)                        # scripts + ignore rule
```

(Route-colocated `_components`/`_hooks`/`_lib` per Next conventions; adjustable to
the team's preferred `components/ios-symbols/` layout.)

## 16. Dependencies

- Add `@tanstack/react-virtual` to `apps/web`.
- Reuse installed shadcn/ui: `input`, `select`, `toggle-group`, `switch`,
  `badge`, `sonner`, `tooltip`, `scroll-area` (+ optional `command`).

## 17. Acceptance criteria

1. `/ios-symbols` renders a smooth, virtualized grid of the 7,945 base symbols.
2. Search narrows results live by name.
3. Category select narrows (OR within selected categories); facet chips narrow
   further (AND across facets).
4. "Show localized" reveals the 1,239 variants and a language sub-filter.
5. The copy-format selector sets the mode; clicking a symbol copies in that
   format with a toast; PNG works where supported with a graceful fallback.
6. Result count is live; empty state offers "clear filters."
7. `pnpm build` succeeds with **no** `plutil`/macOS dependency (manifest is
   committed); only `symbols:meta` requires macOS.
8. Symbols are legible in both light and dark mode.
