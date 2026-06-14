# Compose Side Effects Reference

## Table of Contents

- [Effect Selection Guide](#effect-selection-guide)
- [LaunchedEffect](#launchedeffect)
- [DisposableEffect](#disposableeffect)
- [SideEffect](#sideeffect)
- [rememberCoroutineScope](#remembercoroutinescope)
- [produceState](#producestate)
- [snapshotFlow](#snapshotflow)
- [LifecycleStartEffect and LifecycleResumeEffect](#lifecyclestarteffect-and-lifecycleresumeeffect)
- [Anti-Patterns](#anti-patterns)

## Effect Selection Guide

| Goal | Effect |
|---|---|
| Run a coroutine scoped to this composition | `LaunchedEffect(key) { ... }` |
| Register a listener and unregister on dispose | `DisposableEffect(key) { ... onDispose { ... } }` |
| Publish non-Compose state every successful composition | `SideEffect { ... }` |
| Launch a coroutine in response to a user event (button click) | `rememberCoroutineScope()` then `scope.launch { }` |
| Convert a non-Compose source to `State<T>` | `produceState(initial) { ... }` |
| Observe Compose state as a `Flow<T>` | `snapshotFlow { state.read() }` |
| Run/tear down on lifecycle STARTED / RESUMED | `LifecycleStartEffect` / `LifecycleResumeEffect` |

## LaunchedEffect

Runs a coroutine when entering composition or when `key` changes. Cancels the coroutine when `key` changes or the composition leaves.

```kotlin
@Composable
fun FarmScreen(farmId: String, repo: FarmRepo) {
    var farm by remember { mutableStateOf<Farm?>(null) }
    LaunchedEffect(farmId) {
        farm = repo.load(farmId)   // cancelled and re-run if farmId changes
    }
}
```

Key choice matters:

- `LaunchedEffect(Unit)` — runs once per entry into composition. Use only when the effect truly has no dependencies.
- `LaunchedEffect(realInput)` — restart when the input changes.
- `LaunchedEffect(a, b)` — restart when either changes.

```kotlin
// BUG — `farmId` changes don't trigger a reload
LaunchedEffect(Unit) { farm = repo.load(farmId) }

// Correct
LaunchedEffect(farmId) { farm = repo.load(farmId) }
```

When the effect must see the latest lambda but not restart, use `rememberUpdatedState`:

```kotlin
@Composable
fun AutoSaveDraft(text: String, onSave: (String) -> Unit) {
    val currentOnSave by rememberUpdatedState(onSave)
    LaunchedEffect(Unit) {
        while (isActive) {
            delay(5_000)
            currentOnSave(text)   // but `text` here is also from first composition — usually wrong
        }
    }
}
```

To also get the latest `text`, use `snapshotFlow`:

```kotlin
@Composable
fun AutoSaveDraft(text: String, onSave: (String) -> Unit) {
    val currentOnSave by rememberUpdatedState(onSave)
    LaunchedEffect(Unit) {
        snapshotFlow { text }
            .debounce(500.milliseconds)
            .collectLatest { currentOnSave(it) }
    }
}
```

## DisposableEffect

For listeners that need cleanup. Always returns `onDispose { }`.

```kotlin
@Composable
fun NetworkStatus(onChange: (Boolean) -> Unit) {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(n: Network) { onChange(true) }
            override fun onLost(n: Network) { onChange(false) }
        }
        cm.registerDefaultNetworkCallback(cb)
        onDispose { cm.unregisterNetworkCallback(cb) }
    }
}
```

Missing `onDispose` leaks the listener for the lifetime of the process. The compiler enforces its presence.

## SideEffect

Runs after every successful recomposition. Use to publish the result of the composition to non-Compose code.

```kotlin
@Composable
fun AnalyticsScreenTracker(screen: String) {
    val analytics = LocalAnalytics.current
    SideEffect { analytics.currentScreen = screen }
}
```

Do not launch coroutines in `SideEffect`. Do not read state for logic — `SideEffect` runs after recomposition, so its reads are always up to date, but there is no cancellation or keying.

## rememberCoroutineScope

Provides a `CoroutineScope` tied to the composition lifetime. Use it to launch work in response to events.

```kotlin
@Composable
fun SaveButton(onSave: suspend () -> Unit) {
    val scope = rememberCoroutineScope()
    Button(onClick = { scope.launch { onSave() } }) { Text("Save") }
}
```

Do not call `rememberCoroutineScope()` from inside `LaunchedEffect` — the effect already provides a scope.

## produceState

Converts a non-Compose producer into `State<T>`. Internally it is `remember + LaunchedEffect + setValue`.

```kotlin
@Composable
fun weatherFor(location: Location, repo: WeatherRepo): State<WeatherResult> =
    produceState<WeatherResult>(initialValue = WeatherResult.Loading, location, repo) {
        value = try {
            WeatherResult.Ok(repo.fetch(location))
        } catch (e: IOException) {
            WeatherResult.Err(e)
        }
    }
```

Consumer:

```kotlin
val weather by weatherFor(location, repo)
```

Prefer `produceState` over a raw `LaunchedEffect` + `mutableStateOf` when the composable *is* the producer. Prefer a `ViewModel` for anything non-trivial.

## snapshotFlow

Observes Compose state from a coroutine, emitting when the read changes.

```kotlin
@Composable
fun PagerReporter(pagerState: PagerState, onPageChange: (Int) -> Unit) {
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.settledPage }
            .distinctUntilChanged()
            .collect { onPageChange(it) }
    }
}
```

`snapshotFlow` reads the state inside a snapshot context. Any `State<T>` read inside the block is tracked; a change invalidates the flow and re-emits.

## LifecycleStartEffect and LifecycleResumeEffect

Runs while the LifecycleOwner is at least `STARTED` / `RESUMED`. Replaces the pattern of `DisposableEffect` + `LifecycleEventObserver`.

```kotlin
@Composable
fun LocationPulse(onLocation: (Location) -> Unit) {
    val context = LocalContext.current
    LifecycleStartEffect(Unit) {
        val listener = startLocationUpdates(context, onLocation)
        onStopOrDispose { listener.stop() }
    }
}
```

Use `LifecycleStartEffect` for anything that should sleep while the screen is hidden (camera, location, sensors, long polls). Use `LaunchedEffect` when the work must run whether the user is looking or not (e.g., writing a draft to local storage).

```kotlin
// Resume-only — matches onResume/onPause parity
LifecycleResumeEffect(Unit) {
    val handle = vibrator.startPattern()
    onPauseOrDispose { handle.cancel() }
}
```

## Anti-Patterns

**Launching from an event handler without a scope:**

```kotlin
// BUG — GlobalScope, no cancellation with the screen
Button(onClick = { GlobalScope.launch { save() } }) { Text("Save") }

// Correct
val scope = rememberCoroutineScope()
Button(onClick = { scope.launch { save() } }) { Text("Save") }

// Better — let the ViewModel own the scope
Button(onClick = viewModel::save) { Text("Save") }
```

**Restarting an expensive effect with `System.currentTimeMillis()`:**

```kotlin
// BUG — new key on every recomposition, cancels and restarts constantly
LaunchedEffect(System.currentTimeMillis()) { longRunning() }
```

**Doing work in the composable body:**

```kotlin
// BUG — runs on every composition, happens on the main thread
@Composable
fun Screen(repo: Repo) {
    val data = repo.fetchSync()   // don't
    /* ... */
}
```

**Writing state inside composition without a side-effect API:**

```kotlin
// BUG — mutates during composition, triggers a new composition, infinite loop
@Composable
fun Screen() {
    var count by remember { mutableStateOf(0) }
    count++                     // don't
    Text("$count")
}
```

Mutations go in `LaunchedEffect`, event handlers, or `SideEffect` — never at top level.
