# Compose State Management Reference

## Table of Contents

- [State Primitive Selection](#state-primitive-selection)
- [remember and rememberSaveable](#remember-and-remembersaveable)
- [mutableStateOf vs mutableStateListOf vs mutableStateMapOf](#mutablestateof-vs-mutablestatelistof-vs-mutablestatemapof)
- [derivedStateOf](#derivedstateof)
- [State Hoisting](#state-hoisting)
- [ViewModel + StateFlow + collectAsStateWithLifecycle](#viewmodel--stateflow--collectasstatewithlifecycle)
- [rememberUpdatedState](#rememberupdatedstate)
- [SavedStateHandle and Process Death](#savedstatehandle-and-process-death)
- [Stable and Immutable](#stable-and-immutable)
- [Key Principles](#key-principles)

## State Primitive Selection

| You want | Use |
|---|---|
| A single mutable value local to this composable | `var x by remember { mutableStateOf(...) }` |
| A value that must survive config change / process death | `var x by rememberSaveable { mutableStateOf(...) }` |
| An observable list | `val list = remember { mutableStateListOf<T>() }` |
| An observable map | `val map = remember { mutableStateMapOf<K, V>() }` |
| A value computed from other state, expensive | `val x by remember { derivedStateOf { ... } }` |
| Screen state owned by the ViewModel | `StateFlow<UiState>` + `collectAsStateWithLifecycle()` |
| A callback whose identity shouldn't trigger re-subscription | `val cb by rememberUpdatedState(onClick)` |

## remember and rememberSaveable

`mutableStateOf(...)` must always be inside `remember { }`. A bare `mutableStateOf` re-allocates every composition and drops its value.

```kotlin
// Wrong — allocates a new state object every composition
@Composable
fun Counter() {
    var count = mutableStateOf(0)        // BUG
    Button(onClick = { count.value++ }) { Text("${count.value}") }
}

// Correct
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    Button(onClick = { count++ }) { Text("$count") }
}
```

`remember` survives recomposition; it does **not** survive configuration change or process death. `rememberSaveable` does, as long as the value is `Parcelable`, `Serializable`, or is covered by a `Saver`.

```kotlin
// Survives rotation
var query by rememberSaveable { mutableStateOf("") }

// Custom type — define a Saver
val userSaver = Saver<User, Any>(
    save = { listOf(it.id, it.name) },
    restore = { raw ->
        val list = raw as List<*>
        User(id = list[0] as String, name = list[1] as String)
    }
)
var user by rememberSaveable(stateSaver = userSaver) { mutableStateOf(User("1", "Ada")) }
```

Keys for `remember` / `rememberSaveable` rebuild the stored value when they change:

```kotlin
// Reset the buffer when `messageId` changes
var draft by rememberSaveable(messageId) { mutableStateOf("") }
```

## mutableStateOf vs mutableStateListOf vs mutableStateMapOf

`mutableStateOf(listOf<T>())` creates a snapshot of an immutable list — mutating the list does not recompose. For collections, use the dedicated state collection types.

```kotlin
// Recomposes on add/remove/replace
val items = remember { mutableStateListOf<String>() }
items += "new"

// Does NOT recompose on mutation — the List reference is stable
var items by remember { mutableStateOf(emptyList<String>()) }
items = items + "new"  // this works, because we reassign
```

For a `ViewModel`, prefer `StateFlow<ImmutableList<T>>` (kotlinx-collections-immutable) and replace the whole list on change.

## derivedStateOf

Use when one state read is expensive and depends on others that change more often than the derived value.

```kotlin
val listState = rememberLazyListState()

// Without derivedStateOf — recomposes every scroll pixel
val showFab = listState.firstVisibleItemIndex == 0

// With derivedStateOf — recomposes only when the boolean actually changes
val showFab by remember {
    derivedStateOf { listState.firstVisibleItemIndex == 0 }
}
```

Do not use `derivedStateOf` to derive from a single state read — it adds overhead for no gain. Use it only when multiple reads collapse into a rarely-changing output.

## State Hoisting

Hoisting rule: move state up to the lowest common ancestor that needs to **read or override** it. The composable that renders it receives a value and a lambda.

```kotlin
// Hoisted — caller owns the state
@Composable
fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(value = query, onValueChange = onQueryChange, modifier = modifier)
}

// Caller
@Composable
fun SearchScreen() {
    var query by rememberSaveable { mutableStateOf("") }
    SearchField(query = query, onQueryChange = { query = it })
}
```

Signs state is hoisted too high: the parent has state it never reads. Signs it is hoisted too low: two siblings each keep a copy that must stay in sync.

## ViewModel + StateFlow + collectAsStateWithLifecycle

```kotlin
data class FarmsUiState(
    val farms: List<Farm> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

class FarmsViewModel(repo: FarmsRepo) : ViewModel() {
    val state: StateFlow<FarmsUiState> = repo.observeFarms()
        .map { FarmsUiState(farms = it) }
        .catch { emit(FarmsUiState(error = it.message)) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = FarmsUiState(isLoading = true),
        )
}

@Composable
fun FarmsScreen(viewModel: FarmsViewModel = viewModel()) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    FarmsList(state = ui)
}
```

`SharingStarted.WhileSubscribed(5_000)` keeps the upstream alive for 5 seconds after the last subscriber leaves, surviving config changes without re-fetching.

`collectAsStateWithLifecycle()` stops collecting when the lifecycle falls below `STARTED`, so background emissions don't drive recomposition for an off-screen UI. Never use `collectAsState()` on Android.

## rememberUpdatedState

When a lambda captured by a long-running effect needs to always see the latest value, but re-keying the effect would cancel it:

```kotlin
@Composable
fun Ticker(onTick: () -> Unit) {
    val currentOnTick by rememberUpdatedState(onTick)
    LaunchedEffect(Unit) {
        while (isActive) {
            delay(1_000)
            currentOnTick()
        }
    }
}
```

Without `rememberUpdatedState`, `onTick` is captured from the first composition and never updates.

## SavedStateHandle and Process Death

`ViewModel` receives a `SavedStateHandle` in its constructor via `SavedStateViewModelFactory` (the default). Writes to it are persisted across process death.

```kotlin
class SearchViewModel(private val saved: SavedStateHandle) : ViewModel() {
    val query: StateFlow<String> = saved.getStateFlow("query", "")
    fun onQueryChange(q: String) { saved["query"] = q }
}
```

Pair this with navigation-compose 2.8+ `@Serializable` routes for type-safe argument restoration.

## Stable and Immutable

Strong Skipping Mode is on by default. The compiler skips recomposition for a composable if all its parameters are stable **and** equal to the previous call.

- `@Immutable` — the public contract promises the object's observable behavior never changes after construction. The compiler trusts you.
- `@Stable` — changes to the object's state are signaled through Compose snapshots (i.e., `State<T>` internally). The object itself is mutable but observation-safe.

```kotlin
@Immutable
data class Field(val id: String, val name: String, val acres: Double)

@Stable
class FieldRowState(val field: Field) {
    var isSelected by mutableStateOf(false)
}
```

Common causes of silent instability that defeat Strong Skipping:
- `data class Foo(val bar: List<String>)` — `List<String>` is an interface and is treated as unstable. Use `ImmutableList<String>` (kotlinx-collections-immutable) or mark the class `@Immutable`.
- A parameter typed as an `interface` or generic `T` — unstable unless the concrete instance flows through another skippable composable.
- A `Flow<T>` / `StateFlow<T>` passed directly to a deep child — these are stable (explicit stability annotations), but callers often pass them unnecessarily; prefer passing the collected value.

See `performance-patterns.md` for debugging stability reports.

## Key Principles

- Never bare `mutableStateOf` — always wrap in `remember` or `rememberSaveable`.
- Prefer `rememberSaveable` for anything the user would be annoyed to lose on rotation.
- Hoist state to where it is read or overridden; no higher, no lower.
- Expose UI state from the `ViewModel` as an immutable `StateFlow<UiState>` collected with `collectAsStateWithLifecycle()`.
- Use `derivedStateOf` for rarely-changing derived values computed from frequently-changing reads.
- Annotate data classes exposed to `@Composable` parameters with `@Immutable` when the compiler cannot infer stability.
