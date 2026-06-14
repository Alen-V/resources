# Composable structure, slots, and animation

Review how composables are shaped, how modifiers are passed, and how animations are driven.


## Composable function shape

- A `@Composable` function that returns `Unit` must be `PascalCase` (`HomeScreen`, `TaskRow`).
- A `@Composable` function that returns a value must be `camelCase` (`rememberScrollState`, `animateFloatAsState`).
- Composables should not have side effects during composition beyond `remember { ... }` and `LaunchedEffect`/`DisposableEffect`. Writes to external state during composition are a bug.
- Prefer many small composables over one large one. Each composable is the unit of skipping — splitting enables more fine-grained recomposition.


## Parameter ordering

Required order for a public composable:

1. Required non-modifier parameters (the thing being shown).
2. `modifier: Modifier = Modifier`.
3. Remaining parameters with defaults, ordered from most likely to be overridden to least.
4. Trailing `content: @Composable () -> Unit` (or scoped content lambda) if any.

```kotlin
// Before
@Composable
fun Card(
    content: @Composable () -> Unit,
    title: String,
    modifier: Modifier = Modifier,
    elevation: Dp = 1.dp,
) { ... }

// After
@Composable
fun Card(
    title: String,
    modifier: Modifier = Modifier,
    elevation: Dp = 1.dp,
    content: @Composable () -> Unit,
) { ... }
```

- Every composable that renders UI must accept a `modifier` parameter and apply it to the outermost layout node. Never accept no modifier, never apply the caller's modifier to an inner node.
- Never accept multiple `Modifier` parameters. If you need to style an inner region, expose a separate slot or a dedicated `contentPadding: PaddingValues`.


## Slot APIs

Prefer slots over flags:

```kotlin
// Before — boolean flag for an icon
@Composable
fun ListItem(title: String, showCheck: Boolean) { ... }

// After — slot for an arbitrary trailing composable
@Composable
fun ListItem(
    title: String,
    modifier: Modifier = Modifier,
    trailing: @Composable (() -> Unit)? = null,
) { ... }
```

- Use `Material3` slot-based components (`Scaffold`, `TopAppBar`, `ListItem`, `NavigationBar`) rather than reimplementing them.
- Slot lambdas should be `(() -> Unit)?` (nullable) when optional, not defaulted to `{}` — a defaulted empty lambda still participates in skipping as a stable parameter but produces empty layout nodes.


## Modifier usage

- Chain order is semantic: `Modifier.padding(8.dp).background(Color.Red)` paints the background inside the padding; `Modifier.background(Color.Red).padding(8.dp)` paints outside. Reviewer must confirm the intent matches the chain order.
- Prefer built-in `Modifier` extensions over layout composables where possible: `Modifier.padding`, `Modifier.offset`, `Modifier.size` instead of wrapping in `Box { Spacer; ... }`.
- Do not store `Modifier` in a `val` outside composition — it is cheap to recompute, and storage breaks Strong Skipping (unless the containing class is `@Stable`).
- `Modifier` is stable and can be safely passed as a parameter without defeating skipping.


## Animation

- Use `animate*AsState` (e.g. `animateFloatAsState`, `animateColorAsState`, `animateDpAsState`) for simple single-value animations driven by state.
- Use `Animatable<T, V>` when you need imperative control (`launch { animatable.animateTo(...) }`, `.snapTo(...)`).
- Use `updateTransition` when multiple animated values share a common driving state.
- Keys matter: `animate*AsState(targetValue = x, label = "alpha")` — always provide a non-empty `label` for tooling and debugging.
- Do not animate in the body of a composable with `LaunchedEffect(Unit) { animatable.animateTo(...) }` — key on the target value so the effect restarts when the target changes.

```kotlin
// Before — animation will never restart if target changes
LaunchedEffect(Unit) {
    offset.animateTo(targetOffset)
}

// After — restart when target changes
LaunchedEffect(targetOffset) {
    offset.animateTo(targetOffset)
}
```

- Flag animations with no keys or with `Unit` keys.


## Extracted composables vs computed properties

Do not break up UI via private `@Composable` functions that are really just helper methods of a single screen — those become implicit recomposition boundaries and are usually fine. Do flag cases where a single composable is hundreds of lines long and clearly has sub-regions with independent state; pull them out into sibling composables in the same file (see `references/hygiene.md`).


## Previews

- Every top-level screen and every reusable composable should have at least one `@Preview`.
- Use `@PreviewLightDark`, `@PreviewFontScale`, and `@PreviewScreenSizes` for coverage.
- Previews that take a ViewModel should accept a plain state object instead, so the preview can supply a fake.

```kotlin
// Before — preview can't run because of ViewModel
@Preview
@Composable
private fun HomeScreenPreview() {
    HomeScreen(viewModel = hiltViewModel())
}

// After — split stateful and stateless
@Composable
fun HomeScreen(viewModel: HomeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    HomeScreen(state, viewModel::onEvent)
}

@Composable
fun HomeScreen(state: HomeUiState, onEvent: (HomeEvent) -> Unit) { ... }

@Preview
@Composable
private fun HomeScreenPreview() {
    AppTheme {
        HomeScreen(state = HomeUiState.Sample, onEvent = {})
    }
}
```


## Review checklist

- Composables that render UI accept a single `modifier: Modifier = Modifier` and apply it to the outer node.
- Parameter order is: required, then `modifier`, then defaulted, then trailing content.
- No unused `modifier` parameter (the caller's modifier must actually be applied).
- Unit-returning composables use `PascalCase`; value-returning composables use `camelCase`.
- Slots are used instead of boolean toggles for optional content.
- Animations have meaningful keys and non-empty labels.
- Stateful and stateless variants of screens are split so previews work without a ViewModel.
- Every significant composable has at least one `@Preview`.
