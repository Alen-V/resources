# Modern Kotlin 2.2+ for Compose projects

Review Kotlin language usage. Deeper coverage lives in the `kotlin-idioms` skill — this file focuses on the subset most relevant to Compose codebases.


## val, var, and mutability

- Prefer `val` over `var`. A `var` outside a ViewModel or explicit state holder is usually a smell.
- `val` + `copy()` on a data class beats mutating `var` properties.
- Do not expose `MutableList`, `MutableSet`, `MutableMap` from public API. Expose `List`, `Set`, `Map`, or an immutable collection from kotlinx.collections.immutable.

```kotlin
// Before
class UserRepository {
    val cache: MutableList<User> = mutableListOf()
}

// After
class UserRepository {
    private val _cache = mutableListOf<User>()
    val cache: List<User> get() = _cache
}
```


## Sealed hierarchies over strings and ints

```kotlin
// Before — brittle
data class Event(val type: String, val payload: String)

// After
sealed interface Event {
    data class Clicked(val id: String) : Event
    data class Submitted(val form: FormData) : Event
    data object Dismissed : Event
}
```

- Use `sealed class` when you need shared state/behaviour, `sealed interface` for pure variants.
- `when` on a sealed hierarchy is exhaustive — the compiler catches new variants.
- `data object` (Kotlin 1.9+) replaces `object : Foo()` for singleton variants and gives a sensible `toString()`.


## StateFlow over LiveData

- `StateFlow<T>` is the modern replacement for `LiveData<T>`. It is non-null by default, has a known initial value, is testable without AndroidX `InstantTaskExecutorRule`.
- `SharedFlow` is the multicast cousin — use for one-shot events (snackbars, navigation signals) with `replay = 0, extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST`.
- Convert cold `Flow`s to `StateFlow` with `.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initialValue)`.

```kotlin
// Before
class HomeViewModel : ViewModel() {
    val tasks: LiveData<List<Task>> = repo.observeTasks().asLiveData()
}

// After
class HomeViewModel(private val repo: TaskRepository) : ViewModel() {
    val tasks: StateFlow<ImmutableList<Task>> = repo.observeTasks()
        .map { it.toImmutableList() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), persistentListOf())
}
```


## Result<T> and sealed results over throwing

- Repository-layer suspending functions that can fail should return `Result<T>` or a sealed result type. Throwing across coroutine boundaries loses structured context.
- For business logic, a custom sealed result documents which failures are possible:

```kotlin
sealed interface LoginResult {
    data class Success(val user: User) : LoginResult
    data object InvalidCredentials : LoginResult
    data class Network(val cause: Throwable) : LoginResult
}
```

- `Result<T>` (stdlib) is fine for generic success/failure when callers only need to branch on success.


## Dispatcher switching

- Switch dispatcher at the leaf, not at every call site:

```kotlin
// Before
class UserRepository(private val dao: UserDao) {
    suspend fun load(id: String): User = withContext(Dispatchers.IO) {
        dao.load(id)
    }
}

class UserViewModel(private val repo: UserRepository) : ViewModel() {
    fun load(id: String) = viewModelScope.launch(Dispatchers.IO) {
        _user.value = repo.load(id)
    }
}
```

```kotlin
// After — repository is main-safe; caller doesn't switch again
class UserRepository(private val dao: UserDao) {
    suspend fun load(id: String): User = withContext(Dispatchers.IO) {
        dao.load(id)
    }
}

class UserViewModel(private val repo: UserRepository) : ViewModel() {
    fun load(id: String) = viewModelScope.launch {
        _user.value = repo.load(id)
    }
}
```

- `withContext(Dispatchers.IO)` for blocking I/O, `Dispatchers.Default` for CPU work. `Dispatchers.Main.immediate` is the default for UI code; don't declare it explicitly.
- Never use `runBlocking` in production code outside `main()` or tests.


## Structured concurrency

- Never use `GlobalScope`. Every coroutine belongs to a scope (`viewModelScope`, `lifecycleScope`, a repository's own `CoroutineScope(SupervisorJob() + Dispatchers.Default)` with explicit cancellation).
- Child coroutines propagate failure to their parent scope. Use `supervisorScope { }` when children should fail independently.
- `async { }` requires `.await()` or `.cancel()`. Orphaned `async` leaks.


## Explicit visibility and API surface

- Public Kotlin files should opt in to `explicitApi()` in the module Gradle config: library modules must declare visibility and return types explicitly.
- `internal` is the right default for helpers inside a feature module.
- Extension functions that leak implementation types should be `internal` or `private`.


## Idiomatic collections

- Chain `map`/`filter`/`flatMap` on `List` for small collections (<100 items) — the allocation cost is negligible.
- Convert to `Sequence` only when the chain has many stages over a large collection: `list.asSequence().filter { ... }.map { ... }.toList()`.
- Prefer specific operators when intent is clearer: `associateBy`, `groupBy`, `partition`, `windowed`.
- `buildList { ... }`, `buildMap { ... }`, `buildSet { ... }` for constructing collections imperatively without exposing the mutable builder.


## Context parameters (Kotlin 2.2+)

Kotlin 2.2 introduced `context(...)` parameters as a stable feature:

```kotlin
context(scope: CoroutineScope)
fun Repository.refresh() = scope.launch { ... }
```

- Prefer context parameters for cross-cutting concerns (logging, transactions, coroutine scope) over passing them explicitly through every signature.
- Do not overuse — context parameters that could be ordinary receivers usually should be.


## Null safety

- Do not use `!!` outside test code and truly provably non-null cases. `requireNotNull(x) { "..." }` gives a meaningful error.
- Prefer `?.let { }` or early `return` / `?: return` over deep null-chain nesting.
- `lateinit var` is acceptable for `@Inject` fields and test setup, but never for ordinary business data that has a well-defined initial state — use a nullable `var` or a sealed state.


## Anti-patterns

- `GlobalScope.launch { ... }` anywhere.
- `runBlocking` in production.
- Throwing checked-style exceptions across suspend boundaries without wrapping in a `Result` / sealed result.
- `class Foo { val bar = mutableListOf<String>() }` as public API.
- `var` where `val` would do.
- Raw string API when a sealed hierarchy is natural.
- `Dispatchers.IO` launched directly from a coroutine scope (should be `withContext(Dispatchers.IO)` inside the suspend function).


## Review checklist

- `val` preferred; `var` only where mutation is intended and contained.
- Public APIs expose read-only collection / flow types.
- Sealed hierarchies used for finite variant sets rather than strings or ints.
- `StateFlow` / `SharedFlow` used instead of `LiveData` in new code.
- Dispatcher switching done once at the leaf via `withContext`.
- No `GlobalScope`, no `runBlocking` in production.
- `!!` avoided; replaced with `requireNotNull` or early return.
- Sequences only used for long pipelines over large data.
- Context parameters used for cross-cutting concerns, not forced onto trivial signatures.
- Library modules have explicit visibility (`explicitApi()`) and return types.

See also the `kotlin-idioms` skill for deeper coverage of coroutines, Flow, scope functions, and Kotlin language features.
