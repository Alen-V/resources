# Performance — recomposition, Strong Skipping, stability

Compose performance is almost always about recomposition: how often it happens, and how much work each pass does. Strong Skipping Mode (default since Kotlin 2.0.20 / Compose 1.7) skips a composable when all its parameters are equal to the previous invocation, even for unstable types — but only if lambdas are stable and the runtime can prove equality.


## Strong Skipping Mode

With Strong Skipping:

- A composable with only equal parameters is skipped.
- Lambdas are treated as stable when they capture no unstable state (remembered lambdas, method references on stable receivers, no captured `var`).
- Unstable parameter types no longer force recomposition, but `equals()` must return true for skipping to happen.

This means the biggest wins come from:

1. Making parameter types have correct `equals()` — data classes, `@Immutable`, `ImmutableList`, value classes.
2. Avoiding lambdas that capture unstable state.
3. Hoisting state high enough that downstream composables see stable inputs.


## Recomposition counts

Use the Layout Inspector's "Show Recomposition Counts" to see how many times each composable has recomposed. Targets:

- A screen composable: 1-2 times per user interaction (state change).
- A list row: 1 time when it appears; 0 re-compositions on unrelated state changes.

If a distant, unrelated composable is recomposing on every pixel of a scroll, something is leaking state too high.


## @Stable and @Immutable

- `@Immutable` — all public properties are `val`, and every property's type is itself `@Immutable` (or a primitive, `String`, function type, etc.). `equals()` is structural.
- `@Stable` — `equals()` is correct, and changes to public properties are notified (usually via `MutableState`).

```kotlin
// Before — List<Task> is treated as unstable across module boundaries
data class HomeUiState(
    val tasks: List<Task>,
    val isRefreshing: Boolean,
)

// After
@Immutable
data class HomeUiState(
    val tasks: ImmutableList<Task>,
    val isRefreshing: Boolean,
)
```

- Flag any UI state class containing `List`, `Set`, `Map` without `@Immutable`/`@Stable` or without `ImmutableList`/`ImmutableSet`/`ImmutableMap`.


## Lambda stability

A lambda that captures only stable values is stable. Captures to watch:

- Capturing a plain `var` inside the composable makes the lambda unstable. Prefer `rememberUpdatedState`.
- Capturing a ViewModel method reference (`onClick = viewModel::submit`) is stable if the ViewModel is `@Stable` — ViewModels are inferred stable under Strong Skipping.
- Capturing parameters directly (`onClick = { onSelect(item) }`) works when `item` is stable.

```kotlin
// Before — captures mutable local, forces recomposition of child
var count by remember { mutableStateOf(0) }
Counter(onClick = { count = count + 1 })

// After — stable method reference on a remembered state holder
val holder = remember { CounterHolder() }
Counter(onClick = holder::increment)
```


## derivedStateOf in the right scope

```kotlin
// Before — parent reads scroll position, entire parent recomposes on every scroll pixel
@Composable
fun AppBar(listState: LazyListState) {
    val elevated = listState.firstVisibleItemIndex > 0
    Surface(tonalElevation = if (elevated) 3.dp else 0.dp) { ... }
}

// After — derivedStateOf localises reads; AppBar only recomposes on threshold crossing
@Composable
fun AppBar(listState: LazyListState) {
    val elevated by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 0 }
    }
    Surface(tonalElevation = if (elevated) 3.dp else 0.dp) { ... }
}
```


## Read state in the lowest scope

Move state reads into `Modifier` lambdas that defer them past composition:

```kotlin
// Before — reads offset during composition; parent recomposes on every scroll
Box(Modifier.offset(x = offsetX.dp, y = 0.dp)) { ... }

// After — reads offset during layout, skipping composition
Box(Modifier.offset { IntOffset(x = offsetX.roundToPx(), y = 0) }) { ... }
```

Similarly:

- `Modifier.drawBehind { draw(alpha) }` reads `alpha` during draw.
- `Modifier.graphicsLayer { this.alpha = alpha }` reads `alpha` during draw.
- `Modifier.offset { IntOffset(...) }` reads during layout.

These lambda-based versions are the canonical "state read deferred" patterns. Flag the composition-phase counterparts (`Modifier.alpha(alpha)`, `Modifier.offset(x.dp, y.dp)`) for hot animated values.


## LazyList keys

Always provide a stable `key` for `items { }`:

```kotlin
// Before — reorders force full recomposition of every row
LazyColumn { items(tasks) { TaskRow(it) } }

// After
LazyColumn { items(tasks, key = { it.id }) { TaskRow(it) } }
```

- Without a key, Compose falls back to position-based identity. Adding, removing, or reordering items invalidates every row at or below the change.
- Keys must be stable and unique across the list. Do not use `task.hashCode()` on a mutable task.
- `contentType = { it.javaClass }` helps Compose reuse node structures across different item types.


## Modifier.Node vs composed

`Modifier.composed { }` allocates a new `Modifier` per composition and breaks Strong Skipping because the modifier itself is unstable. Convert to `Modifier.Node`:

```kotlin
// Before
fun Modifier.tint(color: Color) = composed {
    val alpha by animateFloatAsState(1f, label = "tint")
    drawWithContent {
        drawContent()
        drawRect(color.copy(alpha = alpha))
    }
}

// After
fun Modifier.tint(color: Color) = this.then(TintElement(color))

private data class TintElement(val color: Color) : ModifierNodeElement<TintNode>() {
    override fun create() = TintNode(color)
    override fun update(node: TintNode) { node.color = color }
}

private class TintNode(var color: Color) : DrawModifierNode, Modifier.Node() {
    override fun ContentDrawScope.draw() {
        drawContent()
        drawRect(color)
    }
}
```


## Composition allocations

Do not allocate inside composition:

- Do not build `Paint` objects, `Brush.linearGradient(...)`, `Matrix`, etc. during composition. Wrap them in `remember`.
- Do not call `Color(0xFF..).copy(alpha = 0.5f)` inline for a value computed every frame — remember it.
- Do not construct `Modifier` chains in a `val` outside composition unless captured in a stable class.


## rememberUpdatedState

When a long-running effect references a value that may change:

```kotlin
@Composable
fun Timer(onTick: () -> Unit) {
    val currentOnTick by rememberUpdatedState(onTick)
    LaunchedEffect(Unit) {
        while (isActive) {
            delay(1_000)
            currentOnTick()
        }
    }
}
```

- `LaunchedEffect(onTick)` would cancel and restart the timer every recomposition if `onTick` is a freshly-allocated lambda.


## Anti-patterns

- `data class` holding mutable collections with no `@Immutable` annotation.
- Lambdas capturing mutable locals in hot paths.
- `Modifier.composed { }` in new code.
- `items(list) { it }` with no `key =`.
- `Modifier.offset(x.dp, y.dp)` or `Modifier.alpha(alpha)` where `x`/`alpha` is animated state.
- Expensive work (filtering, sorting, JSON parsing) inlined in a composable body.
- `LaunchedEffect(Unit)` that depends on values that change — use the value as the key.


## Review checklist

- UI state classes are `@Immutable` or use immutable collections.
- Public `StateFlow`s emit `@Immutable` values.
- `LazyColumn`/`LazyRow` items have stable `key = { ... }`.
- No `Modifier.composed { ... }` in new code.
- Animated state is read in `graphicsLayer`, `drawBehind`, or `offset { }` lambdas — not in composition.
- `derivedStateOf` wraps derivations that read multiple / frequently-changing states.
- `rememberUpdatedState` is used in long-running `LaunchedEffect`s that reference parameter lambdas.
- No allocations (Paint, Brush, Matrix) in composition without `remember`.
- Lambdas passed down do not capture mutable locals; prefer method references on remembered holders.
- Recomposition counts (Layout Inspector) are low for unrelated state changes.
