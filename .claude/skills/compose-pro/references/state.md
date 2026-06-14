# State, data flow, and single source of truth

Compose state is either remembered in composition, hoisted out to a caller, or owned by a ViewModel. Review every state holder to confirm it is the correct tool.


## remember vs rememberSaveable

- `remember { ... }` survives recomposition but is lost on configuration change and process death.
- `rememberSaveable { ... }` survives configuration change and (for `Parcelable`/`Serializable`/primitive types) process death.
- A custom type in `rememberSaveable` needs an explicit `Saver<T, Any>`:

```kotlin
val saver = listSaver<MyState, Any>(
    save = { listOf(it.id, it.count) },
    restore = { MyState(id = it[0] as String, count = it[1] as Int) },
)
val state = rememberSaveable(saver = saver) { MyState("a", 0) }
```

- Flag `rememberSaveable { mutableStateOf(customClass) }` where `customClass` is not saveable — this silently degrades to lost state.


## State hoisting

State that is read by the parent or a sibling must live in the parent. State that is purely local (scroll offset, whether a dropdown is open) stays inside the composable.

```kotlin
// Before — child owns state the parent cares about
@Composable
fun Form() {
    var name by remember { mutableStateOf("") }
    TextField(name, { name = it })
    Button(onClick = { submit(name) }) { Text("Go") }
}

// After — parent owns state
@Composable
fun FormScreen(viewModel: FormViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Form(
        name = state.name,
        onNameChange = viewModel::onNameChange,
        onSubmit = viewModel::submit,
    )
}

@Composable
fun Form(
    name: String,
    onNameChange: (String) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier) {
        TextField(name, onNameChange)
        Button(onClick = onSubmit) { Text("Go") }
    }
}
```

- The stateless variant is testable, previewable, and reusable. The stateful one is just a thin wrapper.


## derivedStateOf

Use `derivedStateOf` when you read **multiple** states and want to recompose only when the derived value actually changes:

```kotlin
// Before — recomposes on every scroll pixel
val showButton = listState.firstVisibleItemIndex > 0

// After — recomposes only when the boolean flips
val showButton by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 0 }
}
```

- Do not wrap a single state read in `derivedStateOf` — it adds overhead without benefit.


## @Stable and @Immutable

- `@Immutable` promises the object's public properties never change after construction. Compose can skip any composable that takes only `@Immutable` arguments if the arguments `equals()` the previous ones.
- `@Stable` promises that `equals()` is correct and observably stable — changes to public properties are notified via `MutableState` or equivalent.
- Data classes with only `val` primitives, `val String`, `val`-of-other-`@Immutable` are effectively immutable — the Compose compiler infers this with Strong Skipping, but annotating is still useful for classes in other modules that are consumed across module boundaries with the K2 compiler.
- Flag `data class UiState(val tasks: List<Task>)` — `List` is not inferred stable by default. Either use `kotlinx.collections.immutable.ImmutableList` or annotate with `@Immutable`.

```kotlin
// Before — List is unstable, forces HomeScreen to recompose whenever parent recomposes
data class HomeUiState(val tasks: List<Task>)

// After
import kotlinx.collections.immutable.ImmutableList

@Immutable
data class HomeUiState(val tasks: ImmutableList<Task>)
```


## StateFlow in ViewModels

- Expose read-only `StateFlow<T>`, never `MutableStateFlow<T>`:

```kotlin
private val _state = MutableStateFlow(HomeUiState())
val state: StateFlow<HomeUiState> = _state.asStateFlow()
```

- Collect with `collectAsStateWithLifecycle()` in Compose. Never use `collectAsState()` on Android.
- For cold upstream flows, use `stateIn(scope, SharingStarted.WhileSubscribed(5_000), initialValue)` so the flow is recycled when no subscriber is active (5 seconds is the convention; matches the configuration-change window).

```kotlin
val state: StateFlow<HomeUiState> = repository
    .observeTasks()
    .map { HomeUiState(tasks = it.toImmutableList()) }
    .stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState(),
    )
```


## SavedStateHandle

`SavedStateHandle` survives process death and is fed by typed Nav routes:

```kotlin
@HiltViewModel
class DetailViewModel @Inject constructor(
    private val savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val route: Detail = savedStateHandle.toRoute()
    // route.id is available
}
```

- Reach for `SavedStateHandle` for user-typed inputs that should survive process death (draft forms). Trivial UI state (whether a menu is open) can stay in `rememberSaveable`.


## Anti-patterns

- `var items = mutableListOf<Task>()` as `MutableState<List<Task>>` — `List` wrapped in `mutableStateOf` does not notify on internal `add`/`remove`. Use `mutableStateListOf` or a new immutable list.
- `mutableStateOf(x)` in a composable without `remember` — recreated every recomposition.
- Duplicated state: a ViewModel holds `_selected` and the composable also holds `var selected by remember { mutableStateOf(...) }`. Pick one source of truth.
- Writing to state during composition (outside `remember { ... }`):

```kotlin
// Before — illegal write during composition
@Composable
fun Row(item: Item) {
    selectedCount++ // runs every recomposition
    Text(item.name)
}

// After — use a SideEffect or LaunchedEffect if you truly need to notify, or hoist
LaunchedEffect(item.id) { onItemShown(item.id) }
```

- `remember { someFlow.collectAsState() }` — remember returns its block's value, collect returns a `State`, this is a type error that sometimes compiles and always confuses the reader. Use `val state by flow.collectAsStateWithLifecycle()` directly.


## Review checklist

- Every `StateFlow` exposed publicly is read-only (`asStateFlow()` or explicitly typed).
- Every `collectAsState` is actually `collectAsStateWithLifecycle` (Android targets).
- Every `mutableStateOf` inside a composable is wrapped in `remember` or `rememberSaveable`.
- `rememberSaveable` of non-saveable types provides a `Saver`.
- UI state types are `@Immutable` or use `ImmutableList`/`ImmutableSet` rather than `List`/`Set`.
- `derivedStateOf` is used when combining multiple states, not for single reads.
- Stateless composables take `state: T` and `onEvent: (E) -> Unit`; stateful wrappers own the ViewModel.
- No duplicated source of truth between composable-local state and ViewModel state.
- `stateIn` uses `WhileSubscribed(5_000)` for UI flows, not `Eagerly` or `Lazily` unless justified.
