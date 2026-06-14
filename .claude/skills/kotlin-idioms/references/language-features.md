# Language Features

Covers extension functions and properties, `inline` / `reified`, `crossinline` / `noinline`, context parameters (2.2+), operator overloading, `infix`, `typealias`, `@DslMarker`, and Java interop annotations.

## Extension Functions

Add a function that reads as a member, without modifying the class.

```kotlin
fun String.slugify(): String = lowercase()
    .replace(Regex("[^a-z0-9]+"), "-")
    .trim('-')

"Hello, World!".slugify()   // "hello-world"
```

Resolution: extensions are dispatched statically based on the *declared* type, not the runtime type. They cannot override members and cannot be abstract.

```kotlin
open class Animal
class Dog : Animal()

fun Animal.describe() = "animal"
fun Dog.describe()    = "dog"

val a: Animal = Dog()
a.describe()          // "animal"   -- static dispatch on declared type
```

### When to extend vs. to add a top-level function

| Situation | Extension | Top-level function |
|---|---|---|
| Reads like a property of the receiver | yes | no |
| Works on types you don't own | yes | yes |
| Needs generic receiver | yes (extension on `Collection<T>`) | possible but less fluent |
| Will be imported explicitly everywhere | fine either way | fine either way |

Prefer extensions for operations that feel like "something a `Foo` can do" rather than "a procedure on a `Foo`."

### Extension properties

Must be computed (no backing field). Good for derived state:

```kotlin
val String.isBlankOrNull: Boolean get() = isNullOrBlank()
val <T> List<T>.secondOrNull: T? get() = getOrNull(1)
```

### Nullable-receiver extensions

Extensions can declare nullable receivers, which is how `toString()` works on any `Any?`:

```kotlin
fun String?.orDash(): String = this ?: "-"

val s: String? = null
s.orDash()   // "-"
```

## `inline` Functions

`inline` tells the compiler to copy the function body into the call site, including lambda parameters. Benefits:

- No function-object allocation for lambdas
- Non-local returns from the lambda (can `return` out of the enclosing function)
- `reified` type parameters become available

```kotlin
inline fun <T> measureTime(block: () -> T): Pair<Duration, T> {
    val start = System.nanoTime()
    val result = block()
    val elapsed = (System.nanoTime() - start).nanoseconds
    return elapsed to result
}
```

Use `inline` for:
- Higher-order functions used in hot paths
- Functions that need `reified` type parameters

Do not use `inline` for:
- Functions without lambda parameters (no benefit)
- Very large function bodies (bloats every call site)
- Functions in public library API that you may want to evolve without binary-breaking callers

### `reified` type parameters

Only available inside `inline` functions. Lets you use the type parameter at runtime.

```kotlin
inline fun <reified T> Any?.asOrNull(): T? = this as? T
inline fun <reified T : Enum<T>> enumValueOfOrNull(name: String): T? =
    enumValues<T>().firstOrNull { it.name == name }
inline fun <reified T> Bundle.parcelable(key: String): T? =
    if (Build.VERSION.SDK_INT >= 33) getParcelable(key, T::class.java)
    else @Suppress("DEPRECATION") getParcelable(key) as? T

val side = enumValueOfOrNull<Side>("LEFT")
```

### `crossinline` and `noinline`

Lambda parameters of `inline` functions are inlined by default. Modifiers override that:

- `crossinline`: the lambda is still inlined, but cannot perform non-local returns. Use when the lambda is invoked in a nested context (another lambda, a separate coroutine):

```kotlin
inline fun runAfter(delayMs: Long, crossinline block: () -> Unit) {
    Timer().schedule(delayMs) { block() }
}
```

- `noinline`: the lambda is NOT inlined; it becomes a real function object. Use when you need to store or pass it around:

```kotlin
inline fun register(
    immediate: () -> Unit,
    noinline remembered: () -> Unit,
) {
    immediate()
    callbacks += remembered   // allowed because `remembered` is a real function
}
```

## Context Parameters (Kotlin 2.2+)

Replaces the removed context receivers. Declared with `context(name: Type, ...)`:

```kotlin
interface Tx { fun add(change: Change) }
interface Clock { fun nowMillis(): Long }

context(tx: Tx, clock: Clock)
fun recordMove(id: FarmId, from: Location, to: Location) {
    tx.add(Change.Move(id, from, to, clock.nowMillis()))
}

fun runMove(tx: Tx, clock: Clock, id: FarmId, from: Location, to: Location) {
    with(tx) { with(clock) { recordMove(id, from, to) } }
}
```

Rules:
- Only functions and properties; not classes
- Parameters are named; resolution is by name at call site (via `with`, another context-parameter declaration, or class-level `companion` contexts)
- Context parameters are implicit at the call site but explicit in the signature

When to use:
- Cross-cutting concerns that appear in many signatures (logger, clock, transaction, locale, tracing)
- DSLs where a scope implicitly provides multiple capabilities

When *not* to use:
- A single receiver -- use an ordinary extension function
- One concrete dependency -- use constructor injection or a plain parameter
- As a type-class emulation hack -- Kotlin has other mechanisms (interface + default method, delegation)

## Operator Overloading

Kotlin allows overloading a fixed set of operators by defining member or extension functions with specific names. The list is finite; do not try to overload `&&`, `||`, `?:`.

| Operator | Function |
|---|---|
| `+` | `plus` |
| `-` | `minus` |
| `*` | `times` |
| `/` | `div` |
| `%` | `rem` |
| `..` | `rangeTo` |
| `..<` | `rangeUntil` |
| `a[i]` | `get` |
| `a[i] = x` | `set` |
| `a()` | `invoke` |
| `a == b` | `equals` (special: single correct signature) |
| `a < b`, etc. | `compareTo` (returns `Int`) |
| `+=` | `plusAssign` or `plus` + reassign |

Only overload when the operation has widely-understood mathematical or container semantics. `matrix1 + matrix2` is fine; `user + permission` is not.

```kotlin
@JvmInline value class Cents(val value: Int) {
    operator fun plus(other: Cents) = Cents(value + other.value)
    operator fun minus(other: Cents) = Cents(value - other.value)
    operator fun compareTo(other: Cents) = value.compareTo(other.value)
}
```

## `infix` Functions

A one-argument function (member or extension, non-`vararg`, non-default) can be called without dot and parentheses when marked `infix`:

```kotlin
infix fun Int.pow(exp: Int): Int = generateSequence(1) { it * this }.elementAt(exp)

val n = 2 pow 10
```

Built-in `infix`: `to` (pairs), `in` (ranges), `and` / `or` / `xor` / `shl` / `shr` on numeric types. Use sparingly; idiomatic for DSLs.

## `typealias`

Gives an existing type a new name. **Does not create a new type**; any value of the aliased type is assignable:

```kotlin
typealias EventHandler = (Event) -> Unit

val h: EventHandler = { println(it) }
```

Use for:
- Long generic types (`typealias Handler<E> = suspend (E) -> Unit`)
- Function types that appear in many signatures
- Platform-dependent type aliases in `expect` / `actual` multiplatform code

Do **not** use for:
- Distinct IDs (use `@JvmInline value class`, see `references/sealed-and-data.md`)
- Hiding a type to prevent misuse -- the alias is transparent

## `@DslMarker`

Scope-isolates DSL builders so that inner blocks cannot accidentally reach outer receivers.

```kotlin
@DslMarker annotation class HtmlDsl

@HtmlDsl class HtmlBuilder { fun body(block: BodyBuilder.() -> Unit) { ... } }
@HtmlDsl class BodyBuilder { fun p(block: PBuilder.() -> Unit) { ... } }
@HtmlDsl class PBuilder   { fun text(s: String) { ... } }

html {
    body {
        p {
            text("hi")
            // body { ... }   // compile error: outer HtmlBuilder is out of scope inside PBuilder
        }
    }
}
```

Every DSL with nested receivers should use `@DslMarker`; otherwise nested calls can bind to the wrong receiver and silently do the wrong thing.

## Java Interop Annotations

Use these when Kotlin code is called from Java. They are no-ops for Kotlin callers.

| Annotation | Effect |
|---|---|
| `@JvmStatic` | Generate a static accessor on the containing class (vs synthetic `INSTANCE.method()`) |
| `@JvmOverloads` | Generate overloads for each default parameter |
| `@JvmName("foo")` | Override the JVM symbol name for a file / function |
| `@JvmField` | Expose a property directly as a field (no accessor) |
| `@JvmMultifileClass` + `@file:JvmName(...)` | Combine top-level functions from multiple files into one Java class |
| `@JvmSynthetic` | Hide from Java |
| `@Throws(IOException::class)` | Declare checked exceptions for Java callers |

```kotlin
class Api {
    companion object {
        @JvmStatic
        fun instance(): Api = Api()
    }

    @JvmOverloads
    fun fetch(url: String, headers: Map<String, String> = emptyMap()): Response = ...
}
```

Do not scatter `@JvmStatic` / `@JvmOverloads` on Kotlin-only code -- they add synthesized members that complicate reflection and R8.

## Anti-Patterns

- Extension functions that mutate the receiver's internal state "because you can" -- violates expectations, since extensions look like member functions.
- `inline` everywhere -- bloats bytecode; only useful with lambda parameters or `reified`.
- `typealias UserId = String` in place of a value class.
- `@DslMarker` omitted on a DSL with two or more receiver types -- invites silent bugs.
- Top-level `context()` parameters for what is really a single dependency -- use a plain parameter or extension.
- `infix` on operations with no natural English-like reading (`user shl 2` is worse than `user.shiftedBy(2)`).
- Overloading `+` on types that are not numeric or container-like (`user + permission`, `request + header`) -- surprises readers.

See also:
- `references/sealed-and-data.md` for `@JvmInline value class` details
- `references/coroutines-flow.md` for `inline` `suspend` function patterns
- `references/latest-kotlin-apis.md` for context parameters (2.2) and `@all` use-site targets
