# Latest Kotlin APIs Reference

Read this first for every Kotlin task. Covers K2 migration, Kotlin 2.1 and 2.2 language features, and a deprecated-to-modern lookup table.

## Table of Contents
- [K2 Compiler (2.0+)](#k2-compiler-20)
- [Kotlin 2.1 Highlights](#kotlin-21-highlights)
- [Kotlin 2.2 Highlights](#kotlin-22-highlights)
- [Deprecated-to-Modern Lookup](#deprecated-to-modern-lookup)
- [Coroutine / Flow Version Notes](#coroutine--flow-version-notes)

---

## K2 Compiler (2.0+)

The K2 frontend is the default since 2.0. Practical implications:

- Type inference is stricter. Ambiguous overloads that "worked" on K1 may now fail; add an explicit type argument or receiver.
- Smart casts propagate across more boundaries (across `val` property reads, after `?: return`, through `run { }` blocks when the compiler can prove the value is unchanged).
- Exhaustiveness of `when` is enforced more aggressively on `sealed` hierarchies and on `Boolean`.
- Unused `else` branches over `sealed` are reported as warnings.
- Code that relied on K1 quirks should be fixed, not worked around with `@Suppress`.

When migrating a module that was frozen on K1, expect to add explicit type parameters to a few call sites and occasionally split a single `when` that mixed enum cases with a generic `else`.

---

## Kotlin 2.1 Highlights

### Guard conditions in `when`

Add `if (...)` guards after a subject branch; requires `-Xwhen-guards` on older toolchains but is stable in 2.1+.

```kotlin
sealed interface Event {
    data class Tap(val x: Int, val y: Int) : Event
    data class Swipe(val dx: Int, val dy: Int) : Event
    data object Cancel : Event
}

fun describe(event: Event, inBounds: Boolean): String = when (event) {
    is Event.Tap if inBounds -> "tap inside"
    is Event.Tap             -> "tap outside"
    is Event.Swipe if event.dx > 0 -> "swipe right"
    is Event.Swipe           -> "swipe non-right"
    Event.Cancel             -> "cancel"
}
```

Previously required a nested `if` inside each branch; guards keep exhaustiveness.

### Multi-dollar string interpolation

For templates that contain literal `$`, prefix the string with extra dollars so only `$$` (or more) begins an interpolation:

```kotlin
val priceTag = $$"Price: $${amount} USD"        // literal $, interpolates ${amount}
val shellLine = $$$"echo $$HOME $$${user.id}"    // literal $$, interpolates ${user.id}
```

Avoids `\$` escaping in shell snippets, SQL, and regex patterns.

### Non-local `break` / `continue` (preview)

`break` and `continue` work out of inline lambdas like `forEach` in 2.1 preview. Prefer an ordinary `for` loop for now unless your toolchain has this stabilized.

---

## Kotlin 2.2 Highlights

### Context parameters (replace context receivers)

Context receivers from the experimental window are removed. The replacement is context *parameters*, declared with `context(...)` on functions and properties:

```kotlin
interface Logger { fun log(message: String) }
interface Clock  { fun nowMillis(): Long }

context(logger: Logger, clock: Clock)
fun recordEvent(name: String) {
    logger.log("[${clock.nowMillis()}] $name")
}

// Call site supplies contexts implicitly from enclosing scope
fun handle(logger: Logger, clock: Clock) = with(logger) {
    with(clock) {
        recordEvent("handled")
    }
}
```

Differences from the old context receivers:
- Named: `context(logger: Logger, ...)`, not just `context(Logger)`
- Resolution is by parameter name at call sites that declare matching contexts
- Works for functions and properties, not classes

Do not introduce a context parameter where a plain receiver or regular parameter would be clearer -- reserve them for cross-cutting concerns (logging, clock, transaction, locale).

### `@all` use-site annotation target

Applies an annotation to every generated target for a property (backing field, getter, setter, parameter). Use when you previously had to repeat an annotation like `@field:` and `@get:`.

```kotlin
class User(
    @all:Deprecated("Use handle")
    val username: String,
)
```

### `Result<T>` in more places

`Result<T>` as a return type was stabilized in 1.5. In 2.2, interop with `suspend` functions and `runCatching` is smoother; prefer:

```kotlin
suspend fun loadProfile(id: UserId): Result<Profile> = runCatching {
    api.fetchProfile(id.value)
}

val label = loadProfile(id).getOrElse { error ->
    logger.warn("load failed", error)
    "(unknown)"
}
```

Do not use `Result<T>` as a *parameter* type. Do not return `Result<T>` from public library API across module boundaries where a typed error (sealed hierarchy) is more informative.

---

## Deprecated-to-Modern Lookup

| Old pattern | Modern replacement | Why |
|---|---|---|
| `LiveData<T>` | `StateFlow<T>` / `SharedFlow<T>` | Multiplatform, coroutine-native, no Android lifecycle coupling |
| `MutableLiveData<T>().apply { value = x }` | `MutableStateFlow(x)` | One-liner, thread-safe, typed initial value |
| `flow { ... }` emitting from another coroutine | `channelFlow { send(x) }` or `callbackFlow { trySend(x); awaitClose { ... } }` | `flow { emit }` must be called from the same coroutine that runs the builder |
| `GlobalScope.launch { ... }` | `someScope.launch { ... }` with an explicit `CoroutineScope` | Structured concurrency |
| `runBlocking { ... }` in prod | `suspend fun` + propagate to a scope | `runBlocking` blocks the calling thread |
| `try { value!! } catch (e: NPE) { ... }` | `value?.let { ... } ?: fallback` | NPE is a contract failure, not a control-flow signal |
| `if (x == null) throw IllegalArgumentException(...)` | `requireNotNull(x) { "msg" }` | Shorter, built-in message, smart-cast afterward |
| `if (!cond) throw IllegalStateException(...)` | `check(cond) { "msg" }` | Same as above for invariants |
| `object : Comparator<T> { ... }` | `Comparator { a, b -> ... }` or `compareBy { it.field }` | SAM conversion + builders |
| `object : Runnable { override fun run() { ... } }` | `Runnable { ... }` | SAM conversion |
| `class UserId(val value: String)` | `@JvmInline value class UserId(val value: String)` | Zero-alloc, compile-time distinct type |
| `typealias UserId = String` | `@JvmInline value class UserId(val value: String)` | `typealias` is NOT a distinct type -- any `String` is substitutable |
| `enum class State { ... }` + `when` branching | `sealed interface State { data object ... ; data class ... }` when variants carry data | Variants with payloads don't fit enums |
| `sealed class Foo` (no state) | `sealed interface Foo` | Interfaces allow multiple inheritance and no hidden constructor |
| `class Foo private constructor()` + `companion object { val INSTANCE = Foo() }` | `data object Foo` | Synthesized `toString` / `equals` / `hashCode` |
| `List<Foo>().also { it.add(x) }` | `buildList { add(x) }` | Correct: read-only `List` result, avoids intermediate `MutableList` leakage |
| `collection.filter { ... }.map { ... }.first()` on huge collections | `collection.asSequence().filter { ... }.map { ... }.first()` | Lazy, early termination |
| `@Deprecated(..., level = ERROR)` left in place | Remove at the next major version | Long-lived `ERROR` deprecations rot |
| `kotlin.concurrent.thread { ... }` for concurrency | `someScope.launch(Dispatchers.Default) { ... }` | Structured concurrency, cancellation |
| Manual `Mutex` around a single resource | `actor`-like pattern via `Channel` or a `StateFlow` update loop | Simpler, testable |
| `Thread.sleep(1000)` in a coroutine | `delay(1000)` | Cooperative, cancellable |
| `object : CoroutineExceptionHandler { ... }` | `CoroutineExceptionHandler { _, e -> ... }` | SAM |
| `IntArray(n) { 0 }` when all zeros | `IntArray(n)` | Default is zero |
| `listOf<T>()` | `emptyList()` | Reuses a shared singleton |

---

## Coroutine / Flow Version Notes

`kotlinx.coroutines` 1.10.x is current. Notable recent changes vs 1.7 baseline:

| API | Status | Notes |
|---|---|---|
| `Flow.stateIn` / `Flow.shareIn` | Stable | Preferred over `MutableStateFlow` that mirrors another flow |
| `Flow.debounce(Duration)` | Stable | Duration overload supersedes `Long` millis |
| `Flow.timeout(Duration)` | Stable since 1.8 | Throws `TimeoutCancellationException` on the collector |
| `Flow.combine` (6+ sources) | Stable | Up to 5 typed overloads; 6+ takes `vararg Flow<*>` with unsafe casts |
| `Channel<T>.trySend` | Stable | Replaces `offer` |
| `ReceiveChannel.cancel` | Stable | Replaces `cancel(cause)` variant |
| `fold` / `runningFold` on `Flow` | Stable | Prefer over manual accumulator |
| `SharedFlow.subscriptionCount` | Stable | Use for "cold upstream when no subscribers" pattern |
| `Dispatchers.IO.limitedParallelism(n)` | Stable | Use for bounded external-I/O pools instead of custom executors |

---

See also:
- `references/coroutines-flow.md` for full operator treatment
- `references/language-features.md` for context parameters in depth
- `references/sealed-and-data.md` for `sealed interface` + `data object` migration from older `sealed class`
