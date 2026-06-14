# Scope Functions

`let`, `run`, `apply`, `also`, `with`. They all run a block on a value; they differ by how the value is referenced inside and what the block returns.

## Decision Table

| Function | Receiver form | Block access | Returns |
|---|---|---|---|
| `let`   | `x.let { ... }`  | `it`   | block result |
| `run`   | `x.run { ... }`  | `this` | block result |
| `also`  | `x.also { ... }` | `it`   | `x` |
| `apply` | `x.apply { ... }`| `this` | `x` |
| `with`  | `with(x) { ... }`| `this` | block result |

Two axes: **how do I call the receiver** (`this` vs `it`) and **what comes out** (the receiver vs the block result).

```
                  returns receiver       returns block result
 this (extension)      apply                    run
 it                    also                     let
 this (non-ext)        -                        with
```

## When to Use Each

### `let` -- transform, or non-null action

```kotlin
val length: Int? = name?.let { it.trim().length }

user.email?.let { email ->
    mailer.send(email, WelcomeTemplate)
}
```

`?.let { }` is the canonical "do X only if non-null" idiom.

### `run` -- compute a result from configured receiver

```kotlin
val greeting = User("Alice").run {
    "Hello, $name -- you have $unreadCount unread"
}
```

Prefer `run` over `let` when the block reads multiple properties of the receiver and `this.x` reads more naturally than `it.x`. For one-off scoping without a receiver, non-extension `run { }` is fine as a block expression:

```kotlin
val config: Config = run {
    val raw = env["CONFIG"] ?: error("CONFIG missing")
    Json.decodeFromString(raw)
}
```

### `apply` -- configure, return the configured object

```kotlin
val request = Request.Builder().apply {
    url("https://api.example.com/v1/farms")
    addHeader("Authorization", "Bearer $token")
    timeout(10.seconds)
}.build()
```

`apply` shines for builder-style configuration: you call many setters on the same receiver and return it. Use it when the setters are member functions; use `also` when you want to log or register a side effect that refers to the receiver by `it`.

### `also` -- side effect, pass the value through

```kotlin
val token = tokens.fetch()
    .also { logger.debug("token refreshed, expires at ${it.expiresAt}") }

val id = repo.save(draft)
    .also { metrics.incCounter("draft.save", tags = mapOf("draft" to draft.id.value)) }
```

`also` preserves the original value, which is perfect for "take the result, do one more thing with it, then use it." Prefer `also` over `apply` when the side effect refers to the value as a noun (`it`) rather than as a subject (`this`).

### `with` -- group multiple reads on a value

```kotlin
val summary = with(order) {
    "Order $id -- $itemCount items, total $total"
}
```

Use `with(x) { }` when you want `run` behavior but the receiver is not already at hand as a chain. Functionally equivalent to `x.run { }`; prefer `run` in chains, `with` as a top-level block expression.

## Common Idioms

### Null-safe side effect

```kotlin
request.authHeader?.also { logger.debug("using token ${it.take(4)}...") }
```

### Null-safe transform with fallback

```kotlin
val postal: String = address?.let(::formatPostal) ?: "(unknown)"
```

### Fluent configuration of a Java-style builder

```kotlin
val client = OkHttpClient.Builder().apply {
    connectTimeout(5.seconds.toJavaDuration())
    readTimeout(30.seconds.toJavaDuration())
    addInterceptor(LoggingInterceptor)
    if (debugBuild) addInterceptor(ChuckerInterceptor)
}.build()
```

### Chain of transforms with a side effect in the middle

```kotlin
val response = api.fetch(id)
    .also { recordMetric(it) }
    .let(::decode)
```

### Validate on a value before use

```kotlin
val valid = input
    .trim()
    .takeIf { it.isNotBlank() }
    ?.also { logger.info("accepted: $it") }
    ?: return
```

## Anti-Patterns

### Nested scope functions

```kotlin
// Bad
user?.let { u ->
    u.profile?.let { p ->
        p.avatar?.let { a ->
            show(a)
        }
    }
}

// Good
user?.profile?.avatar?.let(::show)
```

### `apply { }` to set a single property

```kotlin
// Bad
val b = Builder().apply { name = "x" }

// Good
val b = Builder().also { it.name = "x" }   // if name is a property, prefer direct assignment
val b = Builder(name = "x")                // best: pass through constructor / named args
```

### `let` to rename the receiver to `it`

```kotlin
// Bad -- it's just `user`, no transform happens
user.let { it.activate() }

// Good
user.activate()
```

### `run` / `with` to save typing

```kotlin
// Bad -- readability suffers
with(record) {
    println("$id $createdAt $modifiedAt $owner $status")
}

// Fine if you use many members inline, but for 1-2 members just reference `record.id`.
```

### `apply` when `also` would be clearer

```kotlin
// Bad -- the receiver is the function argument, `this.id` is confusing
fun onSaved(record: Record) = record.apply {
    logger.info("saved $id")
}

// Good
fun onSaved(record: Record) = record.also {
    logger.info("saved ${it.id}")
}
```

## Choosing Quickly

Ask two questions:

1. **Do I want the receiver or the block result back?** Receiver -> `apply` / `also`. Block result -> `let` / `run` / `with`.
2. **Do I want to reference the receiver as `this` or `it`?** `this` -> `apply` / `run` / `with`. `it` -> `also` / `let`.

| Situation | Pick |
|---|---|
| Do something only if non-null | `?.let { }` |
| Log a value mid-chain, keep going | `.also { }` |
| Configure a builder with many setters | `.apply { }` |
| Compute something from a value's properties | `.run { }` or `with(x) { }` |
| Transform `A -> B` | `.let { ... }` or a plain named function |

See also:
- `references/null-safety.md` for `?.let` idioms
- `references/collections-sequences.md` for `takeIf` / `takeUnless` on collections
- `references/language-features.md` for extension functions as an alternative to `apply`
