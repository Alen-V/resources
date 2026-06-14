# Sealed, Data, and Value Classes

Covers `sealed class` vs `sealed interface`, exhaustive `when`, `data class`, `@JvmInline value class`, enum classes with behavior, and modeling domain state as sealed hierarchies.

## Sealed Hierarchies

A sealed type has a closed set of direct subtypes known at compile time. The compiler enforces exhaustive `when` over sealed types and rejects unknown variants.

### `sealed interface` (preferred in 2.x)

Prefer `sealed interface` unless you need stored state or a protected constructor. Interfaces allow multiple inheritance, work as `data object` markers, and cannot accidentally carry implementation state.

```kotlin
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val throwable: Throwable, val retry: (() -> Unit)? = null) : UiState<Nothing>
}
```

### `sealed class` (when you need shared state)

Use `sealed class` only when every variant must share non-trivial stored state:

```kotlin
sealed class NetworkFailure(open val retryAfter: Duration?) {
    data class Timeout(override val retryAfter: Duration?) : NetworkFailure(retryAfter)
    data class ServerError(val status: Int, override val retryAfter: Duration?) : NetworkFailure(retryAfter)
    data object NoConnectivity : NetworkFailure(retryAfter = null)
}
```

If each variant independently carries the data, `sealed interface` + per-variant `data class` is cleaner.

### Exhaustive `when`

Over a sealed type, a `when` used as an *expression* must be exhaustive:

```kotlin
fun render(state: UiState<Article>): View = when (state) {
    UiState.Loading        -> LoadingSpinner
    is UiState.Success     -> ArticleView(state.data)
    is UiState.Error       -> ErrorView(state.throwable, state.retry)
}
```

As a *statement*, `when` is not required to be exhaustive by default. Make it exhaustive explicitly:

```kotlin
when (event) {
    is Event.Tap    -> handleTap(event)
    is Event.Swipe  -> handleSwipe(event)
    Event.Cancel    -> dismiss()
}.let { }   // forces expression form; K2 will often demand exhaustiveness anyway
```

Never add `else -> Unit` over a sealed hierarchy -- it silences the compiler the next time you add a variant.

### Guard conditions (Kotlin 2.1+)

```kotlin
fun summarize(state: UiState<Article>, premium: Boolean): String = when (state) {
    UiState.Loading                                   -> "loading"
    is UiState.Success if state.data.isPremium && !premium -> "locked"
    is UiState.Success                                -> state.data.title
    is UiState.Error                                  -> "failed: ${state.throwable.message}"
}
```

See `references/latest-kotlin-apis.md` for the 2.1 guard syntax.

## `data class`

`data class` synthesizes `equals`, `hashCode`, `toString`, `componentN`, and `copy` based on properties in the primary constructor.

```kotlin
data class Address(
    val line1: String,
    val line2: String? = null,
    val city: String,
    val postalCode: String,
)

val next = current.copy(line2 = null)
val (l1, l2, city, _) = next          // destructuring via componentN
```

### When NOT to use `data class`

- The type has identity (entity with an ID). Equality by all properties is a bug -- two entities with the same data but different IDs are not equal.
- The type carries references to cyclic graphs or mutable state.
- You need stable binary compatibility (`copy` becomes part of your API surface and is hard to evolve).

For identity-bearing entities, use a regular `class` with explicit `equals` / `hashCode` on the ID:

```kotlin
class Farm(val id: FarmId, val name: String) {
    override fun equals(other: Any?): Boolean = other is Farm && other.id == id
    override fun hashCode(): Int = id.hashCode()
    override fun toString(): String = "Farm($id, $name)"
}
```

### `data object`

`data object` synthesizes a readable `toString` for singletons, preferable to bare `object` for variants of a sealed type:

```kotlin
sealed interface Icon {
    data object Plus : Icon
    data object Minus : Icon
    data class Remote(val url: String) : Icon
}

// Icon.Plus.toString() == "Plus"   (bare `object` gives "Icon$Plus@1a2b3c")
```

## `@JvmInline value class`

Zero-allocation wrapper around a single underlying value. The wrapper exists only in the type system; at runtime the underlying value is passed directly (in most cases).

```kotlin
@JvmInline value class FarmId(val value: String)
@JvmInline value class Cents(val value: Int) {
    init { require(value >= 0) { "cents must be non-negative: $value" } }
    operator fun plus(other: Cents) = Cents(value + other.value)
}

fun charge(id: FarmId, amount: Cents) { ... }

charge(FarmId("f1"), Cents(500))
```

Use for:
- Distinct typed IDs (`UserId`, `FarmId`, `FieldId`) that should never be mixed up
- Units (`Cents`, `Meters`, `Seconds`) that should never be passed as raw primitives
- Validated primitives (non-empty string, non-negative int)

Do **not** use `typealias` for this -- `typealias UserId = String` does not produce a distinct type; any `String` satisfies it.

### Limits of value classes

- Single property in the primary constructor (for now)
- No backing field on additional properties (only computed `val`)
- Cannot have `init` logic that runs *after* full construction of the underlying value in all call sites -- always runs before first use
- Boxing happens when used as a generic type argument, in nullable position (`FarmId?`), or when converted to `Any`
- `equals` / `hashCode` come from the underlying value unless you override them

## Enum with Behavior

Enums are closed sets of named constants, with optional per-constant behavior:

```kotlin
enum class Priority(val weight: Int) {
    Low(1) { override fun label() = "low" },
    Normal(5) { override fun label() = "normal" },
    High(10) { override fun label() = "high" },
    ;
    abstract fun label(): String
}
```

Enums vs `sealed interface`:

| Use case | Use |
|---|---|
| Closed set of simple tags, all identical shape | `enum class` |
| Variants carry different data | `sealed interface` with `data class` / `data object` |
| Need to iterate all variants (`values()`) | `enum class` or `sealed` with `kotlin.reflect` (enum is simpler) |
| Need to deserialize stable names | `enum class` (names are stable) |
| Need nested / generic variants | `sealed interface` |

Kotlin 1.9 added `entries` in place of `values()`:

```kotlin
Priority.entries.forEach { println(it.label()) }
```

## Modeling Domain State

A sealed hierarchy forces the compiler to keep UI/consumer code in sync with the domain.

```kotlin
sealed interface AuthState {
    data object SignedOut : AuthState
    data object Authenticating : AuthState
    data class SignedIn(val user: User, val session: Session) : AuthState
    data class Failed(val reason: AuthFailure, val retryAfter: Duration?) : AuthState
}

sealed interface AuthFailure {
    data object InvalidCredentials : AuthFailure
    data object NetworkUnavailable : AuthFailure
    data class Server(val status: Int, val message: String?) : AuthFailure
}
```

This pattern pairs naturally with `StateFlow<AuthState>` (see `references/coroutines-flow.md`).

### When a field is optional-by-state

Resist the temptation to flatten a sealed state into a single `data class` with many nullable properties:

```kotlin
// Bad: many nullable fields, every consumer checks them independently
data class AuthModel(
    val isLoading: Boolean,
    val user: User?,
    val session: Session?,
    val error: Throwable?,
)

// Good: sealed hierarchy; consumer `when` is exhaustive
sealed interface AuthModel { ... }
```

## `copy` Pitfalls

`copy` is part of your API surface. Adding a required constructor property later forces every `copy(...)` call site to update.

Mitigations:
- Give new properties a sensible default
- For library APIs, consider withholding `data class` entirely or marking it `@ConsistentCopyVisibility` (2.0+) to narrow `copy` visibility

```kotlin
@ConsistentCopyVisibility
data class Credentials internal constructor(val username: String, val token: String)
```

## Anti-Patterns

- `typealias UserId = String` in place of a value class -- no type safety
- `sealed class Foo` with an empty constructor body for every variant -- use `sealed interface`
- `when (state) { ... else -> Unit }` over a sealed type -- silences future exhaustiveness warnings
- `data class` used as a ViewHolder / cached entity / node in a graph -- equality-by-content bites you
- `data class` in public library API with mutable collection properties -- `hashCode` becomes unstable
- `enum class` used when variants need different data shapes -- use `sealed interface`
- `@JvmInline value class` wrapping another `value class` (boxing cascade) -- usually unnecessary

See also:
- `references/coroutines-flow.md` for emitting sealed state via `StateFlow`
- `references/null-safety.md` for modeling optionality as a sealed variant instead of `null`
- `references/latest-kotlin-apis.md` for 2.1 guard conditions and `@ConsistentCopyVisibility`
