# Null Safety

Covers `?.`, `?:`, `!!`, `requireNotNull` / `checkNotNull`, smart casts, `lateinit` vs `by lazy`, platform types from Java interop, and nullable generic type parameters.

## The Short Version

| Operator | What it does | When |
|---|---|---|
| `?.` | Safe call: returns `null` if receiver is null | Chaining reads through nullable values |
| `?:` | Elvis: returns right side if left is null | Providing a default or early return |
| `!!` | Non-null assertion: throws `NullPointerException` if null | Almost never; see below |
| `?.let { ... }` | Run block only if non-null | Non-null action/side effect on a nullable |
| `requireNotNull(x) { msg }` | Contract check: throws `IllegalArgumentException` | Argument invariants |
| `checkNotNull(x) { msg }` | Invariant check: throws `IllegalStateException` | Object-state invariants |

## `?.` Safe Call and `?:` Elvis

```kotlin
val postalCode: String = user.address?.postalCode ?: "00000"
```

Elvis as early return is idiomatic:

```kotlin
fun handle(id: String?) {
    val nonNull: String = id ?: return
    send(nonNull)   // nonNull smart-cast to String
}

fun handleOrThrow(id: String?) {
    val nonNull: String = id ?: error("id must not be null")
    send(nonNull)
}
```

## `!!` is an Anti-Pattern

`x!!` throws `NullPointerException` if `x` is null. In code review, treat every `!!` as a bug until it has an adjacent comment that explains the invariant. Common refactors:

```kotlin
// Bad: silent assumption, breaks at runtime
val title: String = response.body!!.title!!

// Good: Elvis with a real fallback
val title: String = response.body?.title ?: "(untitled)"

// Good: requireNotNull with context on where the invariant comes from
val body = requireNotNull(response.body) { "response body expected after 200 OK" }
val title = requireNotNull(body.title) { "server contract: title always present" }

// Good: early return
val body = response.body ?: return emptyList()
```

### When `!!` is acceptable

- A platform-type value whose non-null-ness is proven by a just-done null check that the compiler cannot see across.
- Calling into Java APIs whose signatures are effectively non-null but lack annotations, *after* adding a nullability annotation upstream would be preferable.
- Inside a `require` / `check` replacement would read worse than the assertion.

Even then, add a one-line comment:

```kotlin
// API guarantees non-null after successful login; see LoginResponse.kt
val token = response.accessToken!!
```

## `requireNotNull` and `checkNotNull`

`require` validates arguments; `check` validates object/function invariants.

```kotlin
class PriceCents(val value: Int) {
    init { require(value >= 0) { "price must be non-negative: $value" } }
}

fun step(next: Step?) {
    val n = requireNotNull(next) { "step.next must be set before step()" }
    process(n)
}

class Session(private var token: String? = null) {
    fun send(msg: String) {
        val t = checkNotNull(token) { "not authenticated" }
        transport.send(msg, t)
    }
}
```

Both smart-cast the variable to non-null after the call.

## Smart Casts

The compiler narrows a type after a null check. K2 propagates narrowing further than K1, including through `?.let`, `?: return`, and across `val` reads of stable properties.

```kotlin
fun greet(user: User?) {
    if (user == null) return
    println(user.name)     // smart-cast to User
}

fun describe(any: Any) = when (any) {
    is String -> any.length      // smart-cast to String
    is Int    -> any + 1
    else      -> -1
}
```

Smart casts do **not** apply to:
- `var` properties visible to other threads (the compiler cannot prove they didn't change)
- `open` properties (subclass may override the getter)
- Properties with custom getters that might return different values per call
- Properties from another module without full type info

In those cases, capture into a local:

```kotlin
val snapshot = someVar ?: return
use(snapshot)
```

## `lateinit` vs `by lazy`

```kotlin
class Profile {
    lateinit var displayName: String            // var, non-null, set later; throws if read first
    val cache: Cache by lazy { Cache.load() }   // val, computed on first read, thread-safe
}
```

| Feature | `lateinit` | `by lazy` |
|---|---|---|
| `val` or `var`? | `var` | `val` |
| Primitive types | No | Yes |
| Nullable types | No | Yes |
| When computed | Explicit assignment | First access |
| Thread-safety | You manage it | `SYNCHRONIZED` by default |
| Error if uninitialized | `UninitializedPropertyAccessException` | N/A (always initializes on read) |
| Can reset? | No (just reassign) | No |

Check whether `lateinit` is initialized:

```kotlin
if (::displayName.isInitialized) { ... }
```

Use `lateinit` for DI-provided properties set immediately after construction; otherwise prefer constructor injection. Use `by lazy` for expensive computations that may never be needed.

## Platform Types (Java Interop)

Java types without nullability annotations arrive as *platform types* (`String!`). Kotlin will not force a null check, but if you treat them as non-null and they are null, you get NPE at the use site.

```kotlin
val name = javaUser.name        // platform type: String!
val length: Int = name.length   // compiles; NPE if name was null
```

Defenses:
- Treat platform types as nullable at the boundary and narrow explicitly
- Prefer Java libraries that ship JSR-305 / Jetbrains `@NotNull` / `@Nullable` annotations
- For frequent callers, wrap the Java API with a Kotlin-typed adapter

```kotlin
// Boundary adapter: turn platform types into honest Kotlin types
fun JavaUser.toKotlin(): User {
    val nonNullName = requireNotNull(name) { "JavaUser.name must be non-null per contract" }
    return User(name = nonNullName, email = email)   // email: String? if intentionally nullable
}
```

## Nullable Generic Type Parameters

`T : Any?` is the default constraint on a generic parameter, which means `T` may be nullable. This leaks nullability through APIs:

```kotlin
class Cache<T> {
    private val map = mutableMapOf<String, T>()
    fun get(key: String): T? = map[key]   // T could itself be nullable, so T? is doubly-nullable in theory
}
```

To require non-null elements, use `T : Any`:

```kotlin
class Cache<T : Any> {
    private val map = mutableMapOf<String, T>()
    fun get(key: String): T? = map[key]   // T? means "absent", not "null value"
}
```

## Common Null Idioms

### Chain with fallback

```kotlin
val headline = article.title
    ?.takeIf { it.isNotBlank() }
    ?: article.slug
    ?: "Untitled"
```

### Run block on non-null

```kotlin
user.email?.let { email ->
    mailer.send(email, welcome)
}
```

### Early return vs. Elvis-throw

```kotlin
val draft = repo.findDraft(id) ?: return Result.NotFound
val owner = draft.owner      ?: error("draft $id has no owner")
```

### Null-safe cast

```kotlin
val picker = fragment as? DatePicker
    ?: return                       // wrong type -> bail out
picker.onPick = ::onDatePicked
```

## Anti-Patterns

- `if (x != null) x!!.foo()` -- redundant; smart-cast covers this.
- `x?.let { it } ?: default` -- just use `x ?: default`.
- `!!.takeIf { ... }` -- if `takeIf` may return null, you need safe handling anyway.
- `lateinit var` on a property that is set in one place in `init` -- make it a `val` and compute in `init`.
- `lateinit var` on a nullable property -- does not compile; use nullable `var` initialized to `null`.
- Using `!!` to satisfy a platform type -- wrap at the boundary instead.

See also:
- `references/scope-functions.md` for `?.let` vs alternatives
- `references/sealed-and-data.md` for modeling optionality as an explicit sum type rather than `null`
- `references/language-features.md` for nullability annotations in Java interop
