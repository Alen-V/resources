# @monorepo/icons

Shared **icon assets** for every app in this monorepo (`apps/web`, `apps/ios`,
`apps/android`).

Currently this folder holds the **SF Symbols** set exported as PNG:

- `*.png` — 9,184 symbols, rendered at 128×128.
- Names follow Apple's SF Symbols convention (`house.fill.png`,
  `speaker.wave.2.png`, `chevron.backward.png`).
- Localized / directional variants carry a language suffix
  (`.ar`, `.he` for RTL; `.hi`, `.ja`, `.ko`, `.zh`, `.bn`, …).

Drop additional icon files in here and let each app reference them by name,
so web, iOS, and Android can never drift apart on which glyph is which.

## Why this folder is not (yet) a package

There's no `package.json` here — this is intentionally a content folder, not a
node package (same convention as `packages/schemas`). Once you wire up
consumption (e.g. an SVG/sprite build, an asset-catalog generator, or a typed
name index), you can:

1. Add a `package.json` with build scripts.
2. Add `packages/icons` to `pnpm-workspace.yaml`.
3. Have each app pull icons from the generated output.

For now it's a parking spot for the raw assets.
