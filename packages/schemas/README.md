# @monorepo/schemas

Source of truth for **cross-platform contracts** shared by all apps in this
monorepo (`apps/web`, `apps/ios`, `apps/android`).

Drop schema files in here — for example:

- OpenAPI specs (`*.yaml`, `*.json`)
- Protobuf definitions (`*.proto`)
- JSON Schema documents
- GraphQL SDL

…and let each app generate its own typed clients from these files. Keeping
the schemas in one place means the web, iOS, and Android apps can never drift
apart on what an API request or domain object looks like.

## Why this folder is not (yet) a package

There's no `package.json` here — this is intentionally a content folder, not a
node package. Once you pick a schema format and wire up codegen, you can:

1. Add a `package.json` with codegen scripts.
2. Add `packages/schemas` to `pnpm-workspace.yaml`.
3. Have each app's build call into the codegen.

For now it's a parking spot.
