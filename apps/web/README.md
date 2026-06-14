This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

From the monorepo root:

```bash
pnpm dev          # starts apps/web (builds design tokens first)
```

Open [http://localhost:3000](http://localhost:3000). The live component gallery lives at `/preview`.

## Adding components

This app is wired up for two shadcn-compatible registries — both use the same CLI, run from `apps/web`:

```bash
# Standard shadcn/ui — lands in src/components/ui/<name>.tsx
pnpm dlx shadcn@latest add <name>

# SmoothUI (smoothui.dev) — lands in src/components/smoothui/<name>/index.tsx
pnpm dlx shadcn@latest add @smoothui/<name>
```

Notes for SmoothUI specifically:

- `motion` is already installed as a peer dep.
- Components that use GSAP will pull in `gsap` on first install.
- Registry components import the `cn` util via `@repo/shadcn-ui/lib/utils`. The `apps/web/tsconfig.json` `paths` field maps that to local `src/`, so imports resolve without manual rewriting.
- After installing a new SmoothUI component, add a section to `src/app/preview/page.tsx` to render it in the gallery.

## Tech stack

- Next.js 16 (turbopack dev, App Router) — see `AGENTS.md` for breaking-change notes
- React 19, TypeScript, Tailwind v4
- shadcn/ui (radix-maia style) in `src/components/ui/`
- SmoothUI (animated components) in `src/components/smoothui/`
- Design tokens generated from `packages/design-tokens/` via `pnpm tokens:build`
