# Collections and Sequences

Covers immutable-by-default collection interfaces, `buildList { }`, when to use `asSequence()`, operator fusion, grouping / associating, and the relationship between `Sequence` and `Flow`.

## Read-Only Interfaces

`List<T>`, `Set<T>`, `Map<K, V>` are read-only *interfaces*, not immutable guarantees. The underlying object may be mutable, but the interface does not expose mutation. Default to these everywhere:

```kotlin
fun active(users: List<User>): List<User> = users.filter { it.isActive }
```

`MutableList<T>`, `MutableSet<T>`, `MutableMap<K, V>` expose mutation. Use them locally during construction; do not return them from public API unless mutation is part of the contract.

```kotlin
// Builder locally, read-only result
fun normalize(raw: List<String>): List<String> {
    val out = mutableListOf<String>()
    for (item in raw) {
        val trimmed = item.trim()
        if (trimmed.isNotEmpty()) out += trimmed
    }
    return out     // caller sees List<String>, not MutableList<String>
}
```

## `buildList`, `buildSet`, `buildMap`

`buildList { }` is the canonical builder: you get a `MutableList` inside the block, a `List` outside. Preferred over manual `mutableListOf` + `return` when the construction is non-trivial.

```kotlin
fun lines(text: String): List<String> = buildList {
    text.splitToSequence('\n').forEach { line ->
        val trimmed = line.trim()
        if (trimmed.isNotEmpty() && !trimmed.startsWith("#")) {
            add(trimmed)
        }
    }
}

fun buildLookup(raw: List<Row>): Map<RowId, Row> = buildMap {
    for (row in raw) {
        val existing = get(row.id)
        if (existing == null || existing.version < row.version) {
            put(row.id, row)
        }
    }
}
```

Prefer `buildList { ... }` over `listOf(...) + ...` chains for performance and clarity.

## Transformations Without Builders

For flat transformations, use the standard collection operators directly:

```kotlin
val emails: List<String> = users
    .filter { it.isActive }
    .map { it.email.lowercase() }
    .distinct()
```

Each operator allocates a new list. For small collections this is fine. For large collections or long chains, switch to `Sequence`.

## `Sequence` and `asSequence()`

A `Sequence<T>` is lazy: operators do not allocate intermediate lists. The chain runs element-by-element on terminal operations (`toList`, `first`, `count`, `fold`, `forEach`).

```kotlin
val firstLarge: File? = files.asSequence()
    .filter { it.length > 1_000_000 }
    .map { it.canonicalFile }
    .firstOrNull()
```

Rules of thumb:

| Size / shape | Use |
|---|---|
| Small (< ~50 elements), 1-2 operators | Collection operators directly |
| Large or unknown size | `asSequence()` |
| Early termination (`first`, `firstOrNull`, `any`, `find`, `take(n)`) | `asSequence()` almost always wins |
| Single-pass `map` or `filter` | Either; collection is fine |
| Many chained operators | `asSequence()` avoids allocating each intermediate |
| Iterating lines from a file or reader | `bufferedReader.lineSequence()` (already a `Sequence`) |

### Fusion

Sequence operators fuse: `filter { }.map { }.filter { }` walks the input once, calling each predicate per element. Collection operators do not fuse; each call produces a fresh list.

```kotlin
// Three list allocations over 10k elements
items.filter(::isValid).map(::toDto).filter(::hasName)

// One walk, no intermediate lists
items.asSequence()
    .filter(::isValid)
    .map(::toDto)
    .filter(::hasName)
    .toList()
```

### When `Sequence` loses

- A single operator -- `items.map(::f)` is already optimal as a list.
- Stateful operators that buffer anyway (`sorted`, `distinct`, `groupBy`): the sequence is materialized inside. No benefit.
- Terminal operators that need the full size (`sorted`, `shuffled`, `reversed`).
- Tiny collections where allocation cost is below measurement noise.

Do not reach for `asSequence` reflexively; measure long chains that show up in profiles.

## Grouping and Associating

| Operator | Shape | Use |
|---|---|---|
| `groupBy { key }` | `Map<K, List<T>>` | Multiple items per key |
| `associateBy { key }` | `Map<K, T>` | One item per key (later wins) |
| `associate { k to v }` | `Map<K, V>` | Arbitrary key+value |
| `associateWith { f(it) }` | `Map<T, V>` | Derive value from element |
| `partition { pred }` | `Pair<List<T>, List<T>>` | Split by predicate |

```kotlin
val byOwner: Map<UserId, List<Farm>> = farms.groupBy { it.ownerId }
val byId: Map<FarmId, Farm> = farms.associateBy { it.id }
val nameByFarm: Map<Farm, String> = farms.associateWith { it.displayName() }
val (active, inactive) = farms.partition { it.isActive }
```

When the input is large, use `groupingBy { }` + folding operators (`eachCount`, `fold`, `reduce`, `aggregate`) to avoid building intermediate lists:

```kotlin
// Builds a Map<Owner, List<Farm>> then counts each
val counts1: Map<UserId, Int> = farms.groupBy { it.ownerId }.mapValues { it.value.size }

// One pass, no intermediate lists
val counts2: Map<UserId, Int> = farms.groupingBy { it.ownerId }.eachCount()
```

## `flatMap` and `flatten`

```kotlin
val allTags: List<String> = posts.flatMap { it.tags }
val matrix: List<Int> = listOf(listOf(1, 2), listOf(3)).flatten()
```

`flatMap` accepts both `(T) -> Iterable<R>` and `(T) -> Sequence<R>`. In a `Sequence` chain, prefer `flatMap { ... .asSequence() }` when the inner call itself is expensive.

## Collection Builders for Specific Shapes

| Need | Idiom |
|---|---|
| Immutable empty collection | `emptyList()`, `emptySet()`, `emptyMap()` |
| Pair of alternatives | `listOf(a) + b.takeIf { ... }` -- but usually just `buildList` |
| Stable order by key | `TreeMap` via `java.util.TreeMap(...)`; Kotlin does not ship an ordered map |
| Unique preserving insertion order | `LinkedHashSet`; `setOf` returns `LinkedHashSet` under the hood |
| Frequency map | `items.groupingBy { it }.eachCount()` |

## `Flow` vs `Sequence`

Both are lazy. They differ fundamentally:

| | `Sequence` | `Flow` |
|---|---|---|
| Context | Synchronous | Coroutine (`suspend`) |
| Backpressure | N/A (pull, synchronous) | Structured concurrency handles it |
| Cancellation | None | Cooperative (`isActive`) |
| Cross-thread | No | Yes (`flowOn`) |
| Use for | In-memory transformations | Async event streams, I/O, time |

Do not convert `Sequence -> Flow` unless you need async behavior; do not convert `Flow -> Sequence` (you cannot suspend from a sequence).

```kotlin
// If the producer is synchronous and finite, use a Sequence
fun fibonacci(): Sequence<Long> = sequence {
    var a = 0L; var b = 1L
    while (true) { yield(a); val t = a + b; a = b; b = t }
}

// If the producer is async or emits over time, use a Flow
fun ticks(period: Duration): Flow<Int> = flow {
    var i = 0
    while (currentCoroutineContext().isActive) { emit(i++); delay(period) }
}
```

See `references/coroutines-flow.md` for `Flow` in full.

## Array vs List

Prefer `List<T>` for almost everything. Arrays show up when:
- Interop with Java / reflection APIs that need `Array<T>`
- Primitive-specialized `IntArray`, `DoubleArray`, etc. for memory-sensitive paths (no boxing)
- `vararg` parameter in inline functions

```kotlin
fun packRgba(r: Int, g: Int, b: Int, a: Int): IntArray = intArrayOf(r, g, b, a)   // no boxing
```

Do not use `Array<Int>` when you mean `IntArray` -- `Array<Int>` boxes every element.

## Anti-Patterns

- Returning `MutableList<T>` from public API "just in case" -- invites aliasing bugs.
- `asSequence()` on a 5-element list for a single `filter` -- pure overhead.
- `.map { }.toList().asSequence()...` in the middle of a chain -- defeats the point.
- `list.filter { it != null }.map { it!! }` -- use `list.filterNotNull()`.
- `list.map { it.x }.toSet()` when you want a set -- `list.mapTo(mutableSetOf()) { it.x }` avoids an intermediate list, or use `list.mapTo(mutableSetOf()) { it.x }` explicitly.
- `.groupBy { }.mapValues { it.value.size }` when `.groupingBy { }.eachCount()` is available.
- Reading a large file with `readLines()` (loads all into memory) instead of `useLines { }` or `bufferedReader().lineSequence()`.

See also:
- `references/coroutines-flow.md` for `Flow` operator semantics
- `references/scope-functions.md` for `takeIf` / `takeUnless`
- `references/language-features.md` for extension functions that add collection-style operators to your own types
