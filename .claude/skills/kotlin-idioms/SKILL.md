---
name: kotlin-idioms
description: Write idiomatic, modern Kotlin (2.2+) covering coroutines/Flow, null safety, sealed/data/value classes, scope functions, collections vs sequences, and language features. Use when writing, reviewing, or improving any Kotlin code outside of Compose-specific rendering concerns.
---

# Kotlin Idioms Skill

## Operating Rules

- Target Kotlin 2.2+ with the K2 compiler; do not suggest pre-2.0 workarounds
- Consult `references/latest-kotlin-apis.md` at the start of every task to avoid deprecated patterns
- Prefer `StateFlow` / `SharedFlow` over `LiveData`; `LiveData` is legacy and should not appear in new code
- Never use `!!` without a comment justifying invariant; prefer `requireNotNull` / `checkNotNull` / `?.let` / `?:`
- Prefer `sealed interface` hierarchies over `when` on `String` tags or unrelated enums
- Prefer immutable `val` and immutable collection interfaces (`List`, `Set`, `Map`) by default; reach for `var` / `MutableList` only with reason
- Enable explicit API mode (`strict`) for library modules and public API surfaces
- Structured concurrency: every coroutine launches inside a named scope with a clear lifecycle; never use `GlobalScope`
- `suspend` functions are main-safe by convention; switch dispatchers with `withContext(Dispatchers.IO)` inside the implementation, not at every call site
- Prefer `Result<T>` for recoverable failures inside a single module; let exceptions propagate across module boundaries only for truly exceptional conditions
- Data-carrying "tag" types should be `@JvmInline value class`, not `typealias` or primitive obsession
- Do not annotate every line; default to zero comments and only add a comment for genuinely non-obvious intent
- Match the surrounding module's style (trailing commas, import order, explicit types on public API) before introducing a new convention

## Task Workflow

### Review existing Kotlin code
- Read the file and identify which topics apply from the Topic Router
- Flag deprecated APIs against `references/latest-kotlin-apis.md`
- Check the Correctness Checklist line-by-line
- Call out `!!` usages, `GlobalScope`, `runBlocking` in production code, and `LiveData` in new code

### Improve existing Kotlin code
- Replace deprecated patterns with entries from `references/latest-kotlin-apis.md`
- Collapse custom sum types into `sealed interface` hierarchies where possible
- Move dispatcher switching into `suspend` function bodies via `withContext`
- Convert primitive-obsession parameters into `@JvmInline value class` wrappers

### Implement new Kotlin code
- Model domain state with `sealed interface` + `data class` / `data object` variants before writing any function that consumes it
- Design the coroutine surface first: which scope owns the work, which dispatcher, what happens on cancellation
- Public API: prefer `Flow<T>` over callback listeners; prefer `suspend fun` over `Future`-style returns
- Validate preconditions with `require` / `check` / `requireNotNull`, not `if (...) throw ...`

## Topic Router

Consult the reference file for each topic relevant to the current task:

| Topic | Reference |
|---|---|
| Coroutines, structured concurrency, dispatchers | `references/coroutines-flow.md` |
| Cold `Flow`, `StateFlow`, `SharedFlow`, operators | `references/coroutines-flow.md` |
| `?.` / `?:` / `!!` / `requireNotNull` / `lateinit` / `by lazy` | `references/null-safety.md` |
| `sealed class` vs `sealed interface`, `data class`, `value class`, enums | `references/sealed-and-data.md` |
| `let` / `run` / `apply` / `also` / `with` decision | `references/scope-functions.md` |
| Collections vs `Sequence`, `buildList`, fusion, `groupBy` / `associateBy` | `references/collections-sequences.md` |
| Extension functions, `inline` / `reified`, context parameters, DSLs, Java interop | `references/language-features.md` |
| K2 migration, 2.1 / 2.2 new features, deprecated-to-modern lookup | `references/latest-kotlin-apis.md` |

## Correctness Checklist

These are hard rules -- violations are always bugs:

- [ ] No `!!` without an adjacent comment explaining the invariant
- [ ] No `GlobalScope.launch` / `GlobalScope.async` in production code
- [ ] No `runBlocking` outside of `main`, tests, or JVM-entry shims
- [ ] `Dispatchers.Main` only for UI-thread work; `Dispatchers.IO` for blocking I/O; `Dispatchers.Default` for CPU
- [ ] `Flow` builders (`flow { }`) do not call `emit` from a different coroutine (use `channelFlow` / `callbackFlow` instead)
- [ ] `StateFlow` `initialValue` is cheap to construct and never throws
- [ ] `when` over a `sealed` hierarchy is exhaustive (no `else -> Unit` swallow)
- [ ] Public `suspend` functions are cancellation-cooperative (`yield()` in long loops, no `try { ... } catch (e: Throwable)` that swallows `CancellationException`)
- [ ] `data class` is not used for types with identity or reference semantics (entities with IDs, view-holders, etc.)
- [ ] `equals` / `hashCode` / `copy` semantics of `data class` are acceptable for every property it carries
- [ ] `val` by default; `var` only where mutation is intentional
- [ ] Public API in library modules has explicit return types (no inferred `: Any`)
- [ ] Collections returned from public API are the read-only `List` / `Set` / `Map` interface unless mutation is part of the contract

## References

- `references/latest-kotlin-apis.md` -- **Read first for every task.** K2 migration, 2.1 and 2.2 features, deprecated-to-modern lookup table
- `references/coroutines-flow.md` -- Structured concurrency, dispatchers, cold `Flow` vs `StateFlow` / `SharedFlow`, operators, testing
- `references/null-safety.md` -- Safe calls, Elvis, `!!` anti-pattern, `requireNotNull`, `lateinit` vs `by lazy`, platform types
- `references/sealed-and-data.md` -- `sealed interface`, exhaustive `when`, `data class`, `@JvmInline value class`, enums with behavior
- `references/scope-functions.md` -- Decision table for `let` / `run` / `apply` / `also` / `with`, common idioms, anti-patterns
- `references/collections-sequences.md` -- Immutable collections, `buildList`, when `asSequence()` is worth it, `Flow` vs `Sequence`
- `references/language-features.md` -- Extension functions, `inline` / `reified`, context parameters, DSL markers, Java interop
