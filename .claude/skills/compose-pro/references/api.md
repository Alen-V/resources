# Using modern Compose and Android API

Read this file first. It is a lookup table of deprecated or legacy patterns and the modern replacement.


## Compose runtime and state

| Legacy | Modern |
| --- | --- |
| `flow.collectAsState()` | `flow.collectAsStateWithLifecycle()` (from `lifecycle-runtime-compose`) |
| `liveData.observeAsState()` | Convert `LiveData` to `StateFlow` and use `collectAsStateWithLifecycle()` |
| `MutableState<List<T>>` holding a `mutableListOf(...)` | `mutableStateListOf<T>()` or a `MutableState<ImmutableList<T>>` from kotlinx.collections.immutable |
| `mutableStateOf(x)` at the top level of a composable (no `remember`) | `remember { mutableStateOf(x) }` or `rememberSaveable { mutableStateOf(x) }` |
| `produceState { value = something() }` for one-shot loads | `LaunchedEffect(key) { state = something() }` with a plain `var state by remember { mutableStateOf(...) }` when you need the key tied to inputs |
| `SnapshotStateList` mutated from a background thread | Mutate on the main thread or wrap in `Snapshot.withMutableSnapshot { }` |

- Never call `mutableStateOf` without `remember` inside a composable — it creates a new state object every recomposition.
- `collectAsStateWithLifecycle()` is the default in Android Compose. `collectAsState()` is appropriate only for non-Android / Compose Multiplatform targets that do not have a `Lifecycle`.


## Modifiers

| Legacy | Modern |
| --- | --- |
| `Modifier.composed { ... }` | `Modifier.Node` via `ModifierNodeElement<NodeType>` |
| `Modifier.onGloballyPositioned { ... }` for size reads | `Modifier.layout { ... }` or `BoxWithConstraints` if only constraints are needed |
| `Modifier.pointerInput(Unit) { detectTapGestures(...) }` for simple clicks | `Modifier.clickable`, `Modifier.toggleable`, `Modifier.selectable` |
| `Modifier.background(color, shape).clip(shape)` | `Modifier.clip(shape).background(color)` — chain order matters; clip before drawing background if you want clipped input too |
| `Modifier.padding(start, top, end, bottom)` on `RTL` layouts | Use `Modifier.padding(horizontal, vertical)` or `PaddingValues` with `Start`/`End` |
| Manual insets via `WindowCompat.setDecorFitsSystemWindows(window, false)` plus padding math | `Modifier.windowInsetsPadding(WindowInsets.systemBars)` / `.safeDrawingPadding()` inside an edge-to-edge `Scaffold` |

- `Modifier.composed { }` is soft-deprecated: it allocates a new `Modifier` per composition and breaks Strong Skipping stability inference. Always prefer a `Modifier.Node` implementation.


## Material

| Legacy | Modern |
| --- | --- |
| `androidx.compose.material.*` (Material 2) | `androidx.compose.material3.*` (Material 3) |
| `TopAppBar` from material | `TopAppBar` / `CenterAlignedTopAppBar` / `LargeTopAppBar` from material3 |
| `ButtonDefaults.buttonColors(backgroundColor = ..., contentColor = ...)` | `ButtonDefaults.buttonColors(containerColor = ..., contentColor = ...)` |
| `Scaffold(topBar, bottomBar, content)` with manual padding ignored | Always apply `innerPadding` from the `content: (PaddingValues) -> Unit` lambda |
| Fixed `BottomNavigation` with rail variant separately | `NavigationSuiteScaffold` (adaptive to width size class) |
| `Icon(imageVector = Icons.Filled.Star, contentDescription = "Star")` for decorative icon | Pass `contentDescription = null` when the icon is purely decorative and labelled by adjacent text |
| Custom elevation with `Modifier.shadow` | `Surface(tonalElevation = ...)` inside a Material3 color scheme |

- Material3 `ButtonColors`, `CardColors`, `TextFieldColors` use `containerColor` not `backgroundColor`. This is the single most common Material2 → Material3 rename.


## Navigation

| Legacy | Modern |
| --- | --- |
| `NavHost(navController, startDestination = "home")` with string routes | `NavHost(navController, startDestination = Home)` with `@Serializable` destination objects (Navigation-Compose 2.8+) |
| `composable("detail/{id}") { ... }` parsing `backStackEntry.arguments?.getString("id")` | `composable<Detail> { val detail: Detail = it.toRoute() }` |
| `BackHandler` wrapping the full screen | Default `NavController` back dispatch + predictive back; only use `BackHandler` for custom dismissal |
| Nav extension `navigation(route = "auth", startDestination = "login")` with strings | `navigation<AuthGraph>(startDestination = Login)` with typed routes |


## Coroutines and Flow

| Legacy | Modern |
| --- | --- |
| `GlobalScope.launch { ... }` in a ViewModel | `viewModelScope.launch { ... }` |
| `suspend fun load() { withContext(Dispatchers.IO) { ... } }` plus another `Dispatchers.IO` in the caller | One `withContext(Dispatchers.IO)` at the leaf; upstream code is main-safe |
| `Dispatchers.IO` bare inside a ViewModel method (`launch(Dispatchers.IO)`) | `viewModelScope.launch { withContext(Dispatchers.IO) { heavyIo() } }` so cancellation and exception handling flow correctly |
| `runBlocking { flow.first() }` in composition | Collect the flow with `collectAsStateWithLifecycle()` or hoist to a ViewModel |
| `LaunchedEffect(Unit)` that re-runs on every recomposition due to unstable key | `LaunchedEffect(stableKey) { ... }` with a key that actually represents the input |

- Flag any `GlobalScope` or `CoroutineScope(Dispatchers.IO)` created inside a composable or ViewModel — they leak.


## Persistence and saved state

| Legacy | Modern |
| --- | --- |
| `rememberSaveable { mutableStateOf(customClass) }` where `customClass` is not `Parcelable`/`Serializable` | Provide a custom `Saver<T, Any>` or hoist into `SavedStateHandle` |
| `onSaveInstanceState` overrides in an `Activity` | `SavedStateHandle` in the ViewModel, populated by Nav typed routes |
| `SharedPreferences` + listener | DataStore (`Preferences` or `Proto`) exposed as `Flow<T>` |


## Constraint layout

`ConstraintLayout` in Compose is available via `androidx.constraintlayout:constraintlayout-compose`. Modern usage:

```kotlin
ConstraintLayout(modifier = Modifier.fillMaxSize()) {
    val (title, body) = createRefs()
    Text(
        "Hello",
        modifier = Modifier.constrainAs(title) {
            top.linkTo(parent.top, margin = 16.dp)
            start.linkTo(parent.start, margin = 16.dp)
        },
    )
    Text(
        "World",
        modifier = Modifier.constrainAs(body) {
            top.linkTo(title.bottom, margin = 8.dp)
            start.linkTo(title.start)
        },
    )
}
```

Reach for `ConstraintLayout` only when nested `Row`/`Column`/`Box` become awkward. For two or three linear children it is overkill.


## Review checklist

- No `collectAsState()` in Android code — should be `collectAsStateWithLifecycle()`.
- No Material2 imports (`androidx.compose.material.*`) mixed with Material3.
- No `backgroundColor =` argument on Material3 color builders.
- No `Modifier.composed { }` in new code.
- No string-based `NavHost` routes when Navigation-Compose 2.8+ is on the classpath.
- No `GlobalScope` anywhere.
- No `mutableStateOf` without `remember` or `rememberSaveable`.
- No `LiveData.observeAsState()` — convert to `StateFlow` and use `collectAsStateWithLifecycle()`.
- No naked `launch(Dispatchers.IO)` — prefer `viewModelScope.launch { withContext(Dispatchers.IO) { ... } }`.
- No `WindowCompat.setDecorFitsSystemWindows` on API 35+ — edge-to-edge is the default.
