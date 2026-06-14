# Lifecycle-Aware Coroutines

`androidx.lifecycle` 2.9+. The rules here prevent the most common bug: flows that keep collecting (and keep burning battery / network / CPU) while the app is in the background.

## Scope cheat sheet

| Scope | Cancelled when | Use for |
|-------|----------------|---------|
| `viewModelScope` | ViewModel cleared | Business logic initiated from UI events |
| `lifecycleScope` (Activity/Fragment) | Lifecycle destroyed | Activity-only work (rare in Compose apps) |
| `rememberCoroutineScope()` (Compose) | Composition leaves | Side-effects tied to a specific composable |
| `GlobalScope` | Never | Almost never. Auth refresh daemon if truly app-lifetime. |
| `CoroutineScope(SupervisorJob() + Dispatchers.Default)` in a `@Singleton` | Manually, or never | App-lifetime repositories that outlive a ViewModel |

Never launch into `GlobalScope` from a ViewModel -- the work survives the VM and leaks.

## `viewModelScope`

```kotlin
@HiltViewModel
class CreateRecordViewModel @Inject constructor(
    private val recordRepository: RecordRepository,
) : ViewModel() {

    fun save(draft: RecordDraft) {
        viewModelScope.launch {
            _uiState.update { it.copy(saving = true) }
            runCatching { recordRepository.create(draft) }
                .onSuccess { _events.emit(CreateRecordEvent.Saved) }
                .onFailure { _events.emit(CreateRecordEvent.Error(it.message ?: "Failed")) }
            _uiState.update { it.copy(saving = false) }
        }
    }
}
```

`viewModelScope` uses `Dispatchers.Main.immediate` by default. I/O work must call `withContext(Dispatchers.IO)` or the repository should `flowOn(io)`.

## Observing from UI: `collectAsStateWithLifecycle`

```kotlin
@Composable
fun FarmListScreen(viewModel: FarmListViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val events = viewModel.events
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(events, snackbar) {
        events.flowWithLifecycle(lifecycle).collect { event ->
            when (event) {
                is FarmListEvent.Error -> snackbar.showSnackbar(event.message)
            }
        }
    }
}
```

**Never** `viewModel.uiState.collectAsState()` on Android. It keeps collecting in the background and is responsible for a large fraction of Android battery reviews.

## `repeatOnLifecycle` / `flowWithLifecycle`

For non-Compose consumers (Fragments, View-based code) or Compose side-effects:

```kotlin
class FarmListFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { render(it) }
            }
        }
    }
}
```

`repeatOnLifecycle(STARTED)` starts collecting on `onStart`, cancels on `onStop`, restarts on next `onStart`. `flowWithLifecycle` is the operator form for composition:

```kotlin
LaunchedEffect(Unit) {
    viewModel.events
        .flowWithLifecycle(lifecycleOwner.lifecycle, Lifecycle.State.STARTED)
        .collect(::handle)
}
```

## Compose lifecycle effects

```kotlin
@Composable
fun TimerScreen() {
    LifecycleStartEffect(Unit) {
        val job = startTimer()
        onStopOrDispose {
            job.cancel()
        }
    }

    LifecycleResumeEffect(Unit) {
        analytics.logScreenView("timer")
        onPauseOrDispose { analytics.logScreenExit("timer") }
    }
}
```

| Effect | Runs | Best for |
|--------|------|----------|
| `LaunchedEffect(key)` | Composition + key changes, cancels on leave | Kickoff work tied to composition |
| `LifecycleStartEffect(key)` | Each `onStart` | Foreground-only work (polling, tickers) |
| `LifecycleResumeEffect(key)` | Each `onResume` | Foreground + interactive work |
| `DisposableEffect(key)` | Composition, cleanup on leave | Listener registration/unregistration |

Never use `LaunchedEffect(Unit) { someFlow.collect { ... } }` for a flow that should stop in background. It won't -- it runs until the composition leaves, which for a full-screen composable means "until the user navigates away". Wrap with `flowWithLifecycle` or switch to `LifecycleStartEffect`.

## Process lifecycle

```kotlin
class NumanacApp : Application() {
    @Inject lateinit var syncScheduler: SyncScheduler

    override fun onCreate() {
        super.onCreate()
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) {
                syncScheduler.onAppForeground()
            }
            override fun onStop(owner: LifecycleOwner) {
                syncScheduler.onAppBackground()
            }
        })
    }
}
```

`ProcessLifecycleOwner` is useful for app-wide foreground/background signals -- debouncing auth refresh, pausing realtime subscriptions. Do not use it as a substitute for Activity lifecycle.

## App-scope repositories

Some repositories need a scope that outlives any one ViewModel but respects cancellation:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object CoroutineScopeModule {
    @Provides
    @Singleton
    @ApplicationScope
    fun provideAppScope(): CoroutineScope =
        CoroutineScope(SupervisorJob() + Dispatchers.Default + CoroutineName("AppScope"))
}

@Singleton
class RealtimeSubscription @Inject constructor(
    @ApplicationScope private val scope: CoroutineScope,
    private val client: RealtimeClient,
) {
    fun start() {
        scope.launch { client.connect().collect(::handleEvent) }
    }
}
```

`SupervisorJob` so one failure doesn't cancel siblings. Tie a dedicated scope to a concept ("realtime", "sync"), not one giant `@ApplicationScope`.

## Dispatcher qualifiers

```kotlin
@Retention(AnnotationRetention.RUNTIME) @Qualifier annotation class IoDispatcher
@Retention(AnnotationRetention.RUNTIME) @Qualifier annotation class DefaultDispatcher
@Retention(AnnotationRetention.RUNTIME) @Qualifier annotation class MainDispatcher

@Module
@InstallIn(SingletonComponent::class)
object DispatchersModule {
    @Provides @IoDispatcher fun io(): CoroutineDispatcher = Dispatchers.IO
    @Provides @DefaultDispatcher fun default(): CoroutineDispatcher = Dispatchers.Default
    @Provides @MainDispatcher fun main(): CoroutineDispatcher = Dispatchers.Main
}
```

Inject dispatchers for testability -- swap for `UnconfinedTestDispatcher` in tests. Never reference `Dispatchers.IO` directly inside a repository.

## Leaks and anti-patterns

| Pattern | Why it leaks | Fix |
|---------|--------------|-----|
| `viewModel.uiState.collectAsState()` | Keeps collecting in background | `collectAsStateWithLifecycle()` |
| `LaunchedEffect(Unit) { flow.collect { } }` where flow is remote | Continues in background | Wrap flow with `flowWithLifecycle` or use `LifecycleStartEffect` |
| `GlobalScope.launch { }` in ViewModel | Survives VM clear | `viewModelScope.launch` |
| Context capture in a `GlobalScope` lambda | Leaks activity | Don't use `GlobalScope`; or use `applicationContext` |
| `snapshotFlow { state.value }.collect { }` without dispatcher | Reads snapshot off main | Collect on main dispatcher |
| Expensive work on `Dispatchers.Main` | ANRs | `withContext(io)` or `Dispatchers.Default` |

## Cross-references

- Flow basics and coroutine language: `kotlin-idioms` skill
- Compose-specific side effects (`LaunchedEffect`, `DisposableEffect`, `produceState`): `jetpack-compose-expert` skill
- Testing suspend code: `testing.md`
