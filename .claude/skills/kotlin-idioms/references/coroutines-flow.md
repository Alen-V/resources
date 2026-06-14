# Coroutines and Flow

Covers structured concurrency, dispatchers, cancellation, cold `Flow`, `StateFlow` / `SharedFlow`, common operators, exception handling, and testing notes.

## Structured Concurrency

Every coroutine belongs to a `CoroutineScope`. The scope defines the lifetime: when the scope is cancelled, all children are cancelled. Never use `GlobalScope` in production code -- it has no parent, so cancellations are impossible and leaks are silent.

```kotlin
class Downloader(
    private val scope: CoroutineScope,
    private val api: Api,
) {
    fun start(id: String) = scope.launch {
        val data = api.fetch(id)
        persist(data)
    }
}
```

The *caller* owns the scope. The class that does the work receives it. This keeps lifecycle explicit.

### `SupervisorJob` vs `Job`

`Job` (the default) propagates child failure upward -- one failing child cancels siblings. `SupervisorJob` isolates children so one failure does not bring down the others.

Use `SupervisorJob` for top-level scopes that manage independent work (a list of background syncs, an app-level scope that spawns unrelated features). Use a regular `Job` for fork/join-style "all-or-nothing" work inside a single operation.

```kotlin
val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default + CoroutineName("app"))

suspend fun loadAll() = coroutineScope {          // regular Job: fails fast if any child fails
    val a = async { loadA() }
    val b = async { loadB() }
    a.await() to b.await()
}

suspend fun loadAllLenient() = supervisorScope {  // supervisor: independent children
    val a = async { loadA() }
    val b = async { loadB() }
    Pair(
        runCatching { a.await() }.getOrNull(),
        runCatching { b.await() }.getOrNull(),
    )
}
```

### `viewModelScope` (Android)

In Android, `viewModelScope` is a `SupervisorJob`-backed scope tied to the `ViewModel` lifecycle. It is the default scope for `ViewModel` work:

```kotlin
class ProfileViewModel(private val repo: ProfileRepo) : ViewModel() {
    fun refresh() = viewModelScope.launch {
        repo.refresh()
    }
}
```

Cancellation happens automatically in `onCleared`. Do not capture `viewModelScope` into long-lived singletons.

## Dispatchers

| Dispatcher | Use for |
|---|---|
| `Dispatchers.Main` | UI-thread updates (Android/JVM UI, iOS via KMP) |
| `Dispatchers.Main.immediate` | Avoid re-dispatch if already on main |
| `Dispatchers.Default` | CPU-bound work (JSON parsing, computation) |
| `Dispatchers.IO` | Blocking I/O (disk, network blocking calls, `java.io`, JDBC) |
| `Dispatchers.Unconfined` | Tests only; do not use in prod |

A `suspend` function should be *main-safe*: callable from `Dispatchers.Main` without freezing it. Switch dispatchers inside the implementation with `withContext`, not at every call site.

```kotlin
// Good: caller does not need to know the dispatcher
suspend fun readSettings(): Settings = withContext(Dispatchers.IO) {
    file.readText().let { Json.decodeFromString(it) }
}

// Bad: leaks the dispatcher choice to every caller
fun readSettings(scope: CoroutineScope): Deferred<Settings> =
    scope.async(Dispatchers.IO) { ... }
```

### Bounded IO parallelism

`Dispatchers.IO` allows up to 64 concurrent tasks by default. For bounded external resources (a connection pool, a third-party SDK), carve out a limited slice:

```kotlin
val imageIo: CoroutineDispatcher = Dispatchers.IO.limitedParallelism(4)
```

## Cancellation

Cancellation is cooperative -- your code must check for it.

```kotlin
suspend fun processAll(items: List<Item>) {
    items.forEach { item ->
        yield()            // cancellation check + fairness
        process(item)
    }
}
```

`suspend` functions in `kotlinx.coroutines` (including `delay`, `withContext`, `yield`) check for cancellation. Tight CPU loops must call `yield()` or `ensureActive()` periodically.

Never swallow `CancellationException`:

```kotlin
// Wrong: swallows cancellation
try {
    doWork()
} catch (e: Throwable) {
    log(e)
}

// Right: re-throw cancellation, handle the rest
try {
    doWork()
} catch (e: CancellationException) {
    throw e
} catch (e: Throwable) {
    log(e)
}

// Better: use runCatching, which re-throws CancellationException by default in 1.8+
runCatching { doWork() }.onFailure(::log)
```

## Cold Flow vs `StateFlow` vs `SharedFlow`

| Type | Cold/Hot | Has value? | Replay | Use for |
|---|---|---|---|---|
| `Flow<T>` | Cold -- each collector triggers the builder | No | N/A | Transformations, one-shot streams, producer/consumer |
| `StateFlow<T>` | Hot | Yes (required initial value) | 1 (current value) | Observable state -- UI state, settings, session |
| `SharedFlow<T>` | Hot | No (unless replay > 0) | configurable | Events -- navigation, one-shot signals, telemetry |

### Cold `Flow`

```kotlin
fun ticks(period: Duration): Flow<Long> = flow {
    var tick = 0L
    while (true) {
        emit(tick++)
        delay(period)
    }
}
```

Rules:
- `emit` must be called from the coroutine that runs the builder. Emitting from a different coroutine throws.
- To bridge a callback API, use `callbackFlow`. To send from multiple producers, use `channelFlow`.

```kotlin
fun locationUpdates(manager: LocationManager): Flow<Location> = callbackFlow {
    val callback = LocationCallback { loc -> trySend(loc) }
    manager.register(callback)
    awaitClose { manager.unregister(callback) }
}
```

### `StateFlow`

```kotlin
class SessionRepo {
    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session.asStateFlow()

    fun set(session: Session?) { _session.value = session }
}
```

- `value` is always defined (required initial value -- keep it cheap and non-throwing).
- Conflates: only the latest value is delivered to slow collectors.
- Distinct by default: duplicate `value` writes do not re-emit.
- `asStateFlow()` yields a read-only view.

### `SharedFlow`

```kotlin
class Events {
    private val _events = MutableSharedFlow<Event>(
        replay = 0,
        extraBufferCapacity = 8,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<Event> = _events.asSharedFlow()

    suspend fun emit(event: Event) = _events.emit(event)
    fun tryEmit(event: Event): Boolean = _events.tryEmit(event)
}
```

For one-shot events (navigate once, show toast once) prefer `SharedFlow` with `replay = 0` over `StateFlow<Event?>` with a manual "consumed" reset.

### `stateIn` / `shareIn`

Convert a cold `Flow` into hot state/event streams tied to a scope:

```kotlin
class SearchViewModel(private val repo: SearchRepo) : ViewModel() {
    private val query = MutableStateFlow("")

    val results: StateFlow<Results> = query
        .debounce(250.milliseconds)
        .flatMapLatest { q -> repo.search(q) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = Results.Idle,
        )
}
```

`SharingStarted.WhileSubscribed(stopTimeoutMillis)` keeps the upstream alive briefly after the last subscriber leaves -- good for config changes where the consumer disappears and reappears within milliseconds.

## Operators: `flatMap*`

| Operator | Behavior |
|---|---|
| `flatMapConcat` | Sequential: wait for each inner flow to finish before subscribing to the next |
| `flatMapMerge` | Concurrent: subscribe to all inner flows up to a concurrency limit |
| `flatMapLatest` | Cancel the previous inner flow when a new upstream value arrives |

```kotlin
// Search: cancel in-flight search when the user types another character
val results = query.flatMapLatest { q -> repo.search(q) }

// Ordered steps: wait for step N before running step N+1
val steps = stepIds.asFlow().flatMapConcat { id -> runStep(id) }

// Parallel image loads with concurrency limit
val images = urls.asFlow().flatMapMerge(concurrency = 4) { url -> loadImage(url) }
```

## `combine`

Combines the latest value of multiple flows; re-emits whenever any source emits.

```kotlin
val canSubmit: Flow<Boolean> = combine(nameFlow, emailFlow, acceptedFlow) { name, email, accepted ->
    name.isNotBlank() && email.matches(emailRegex) && accepted
}
```

For 2 flows prefer `combine` over `zip`; `zip` pairs by index, which is rarely what UI state wants.

## Exception Handling

- `catch { }`: handles exceptions from upstream (builder and transformations), not from the collector.
- `onCompletion { cause -> }`: runs on completion or cancellation, with a non-null `cause` on failure.
- `retry { cause -> cause is IOException }` / `retryWhen { cause, attempt -> ... }`: re-subscribe on upstream failure.

```kotlin
repo.items
    .retryWhen { cause, attempt -> cause is IOException && attempt < 3 }
    .catch { error -> emit(emptyList()); logger.warn("items failed", error) }
    .collect { items -> updateUi(items) }
```

Place `catch` *after* the operators it should protect -- it only sees upstream errors.

## Testing

Use `kotlinx-coroutines-test` with a `TestScope` and `runTest`. Virtual time advances with `advanceUntilIdle` / `advanceTimeBy`.

```kotlin
@Test
fun debouncesQuery() = runTest {
    val vm = SearchViewModel(repo = FakeRepo(), scope = backgroundScope)
    vm.query.value = "a"
    advanceTimeBy(100.milliseconds)
    vm.query.value = "ab"
    advanceUntilIdle()

    assertEquals(listOf("ab"), repo.queries)
}
```

For `Flow` assertions, `app.cash.turbine.Turbine` is the standard library -- `flow.test { awaitItem(); awaitComplete() }`. Mention it, don't require it; plain `flow.toList()` is fine for small finite flows.

## Anti-Patterns

- `GlobalScope.launch`: no parent, no cancellation, no context. Never.
- `runBlocking` in production: blocks the calling thread. Acceptable only in `main`, tests, and JVM-entry shims.
- Emitting from another coroutine in `flow { }`: throws. Use `channelFlow` / `callbackFlow`.
- `StateFlow<Event?>` with manual reset for one-shot events: race-prone. Use `SharedFlow(replay = 0)`.
- Swallowing `CancellationException` in a `catch (e: Throwable)`: breaks structured concurrency.
- `launch { ... }` + `.join()` instead of `async { ... }.await()` when you need the result.
- Calling `collect` in one place and `collect` again in another on the same cold flow and expecting shared upstream: wrap with `shareIn`.

See also:
- `references/null-safety.md` for `requireNotNull` / Elvis patterns inside coroutines
- `references/sealed-and-data.md` for UI state modeling emitted via `StateFlow`
- `references/latest-kotlin-apis.md` for `kotlinx.coroutines` 1.10.x version notes
