# Latest Jetpack Compose APIs Reference

> Baseline: Compose BOM `2026.02.x`, Compose Runtime 1.8+, Foundation / Material3 1.4+, Kotlin 2.2.x (K2), Android 14 / 15 behaviour defaults.

## Table of Contents

- [Imports — Material 2 vs Material 3](#imports--material-2-vs-material-3)
- [State Collection](#state-collection)
- [Top App Bars and Scaffold](#top-app-bars-and-scaffold)
- [Buttons and Colors](#buttons-and-colors)
- [Navigation](#navigation)
- [Custom Modifiers](#custom-modifiers)
- [Side Effects](#side-effects)
- [Insets and Edge-to-Edge](#insets-and-edge-to-edge)
- [Back Navigation](#back-navigation)
- [Lists](#lists)
- [Layout Callbacks](#layout-callbacks)
- [Animations](#animations)
- [Other Renames](#other-renames)

---

## Imports — Material 2 vs Material 3

Material 2 (`androidx.compose.material.*`) still compiles but is deprecated for new work. A Material 3 app must not mix them — it breaks theming and ripple.

| Deprecated | Modern |
|---|---|
| `androidx.compose.material.Button` | `androidx.compose.material3.Button` |
| `androidx.compose.material.Text` | `androidx.compose.material3.Text` |
| `androidx.compose.material.Scaffold` | `androidx.compose.material3.Scaffold` |
| `androidx.compose.material.MaterialTheme` | `androidx.compose.material3.MaterialTheme` |
| `androidx.compose.material.icons.*` | Still valid — icons are shared |

Rule: if a file imports `androidx.compose.material.*` outside of `icons.*`, it is stale.

## State Collection

```kotlin
// Deprecated on Android — not lifecycle-aware, keeps collecting in STOPPED state
val ui by viewModel.state.collectAsState()

// Modern
import androidx.lifecycle.compose.collectAsStateWithLifecycle
val ui by viewModel.state.collectAsStateWithLifecycle()
```

`collectAsStateWithLifecycle` defaults to `Lifecycle.State.STARTED`. Override with `minActiveState = Lifecycle.State.RESUMED` only when the consumer genuinely needs it.

For one-shot `Flow` reads inside effects, use `snapshotFlow { ... }` or `LaunchedEffect` with `flow.collect { }` — never `collectAsState()` inside a non-composable callback.

## Top App Bars and Scaffold

| Deprecated | Modern |
|---|---|
| `material.TopAppBar(title = ..., backgroundColor = ...)` | `material3.TopAppBar(title = { }, colors = TopAppBarDefaults.topAppBarColors(containerColor = ...))` |
| `Scaffold(topBar = ..., bodyContent = ...)` | `Scaffold(topBar = ..., content = { padding -> })` |
| Manual `paddingValues` ignore | Always apply `Modifier.padding(innerPadding)` to the Scaffold body's root |

Material 3 `TopAppBar` has variants `TopAppBar`, `CenterAlignedTopAppBar`, `MediumTopAppBar`, `LargeTopAppBar`, and — in Expressive — `FlexibleTopAppBar`. Pick by scroll behavior, not look.

## Buttons and Colors

```kotlin
// Deprecated — Material 2 parameter names
ButtonDefaults.buttonColors(
    backgroundColor = Color.Red,
    contentColor = Color.White,
)

// Modern — Material 3 uses containerColor
ButtonDefaults.buttonColors(
    containerColor = MaterialTheme.colorScheme.error,
    contentColor = MaterialTheme.colorScheme.onError,
)
```

Prefer `MaterialTheme.colorScheme.*` tokens over hardcoded `Color(0xFF...)`. Use `FilledTonalButton`, `OutlinedButton`, `TextButton`, `ElevatedButton` rather than overriding `Button` colors to mimic them.

## Navigation

Navigation-Compose 2.8+ supports type-safe routes via `kotlinx.serialization`:

```kotlin
@Serializable data object Home
@Serializable data class FieldDetails(val id: String)

NavHost(navController, startDestination = Home) {
    composable<Home> { HomeScreen(onField = { navController.navigate(FieldDetails(it)) }) }
    composable<FieldDetails> { backStack ->
        val args = backStack.toRoute<FieldDetails>()
        FieldDetailsScreen(id = args.id)
    }
}
```

Deprecated: string-based `"field/{id}"` routes with `NavType.StringType` argument blocks. They still compile; new screens should use `@Serializable`.

## Custom Modifiers

```kotlin
// Deprecated — allocates per composition, recomposes callers
fun Modifier.dashedBorder(color: Color) = composed {
    val density = LocalDensity.current
    drawBehind { /* ... */ }
}

// Modern — Modifier.Node, zero-allocation, not a composable
fun Modifier.dashedBorder(color: Color): Modifier =
    this then DashedBorderElement(color)

private data class DashedBorderElement(val color: Color) : ModifierNodeElement<DashedBorderNode>() {
    override fun create() = DashedBorderNode(color)
    override fun update(node: DashedBorderNode) { node.color = color }
}

private class DashedBorderNode(var color: Color) : Modifier.Node(), DrawModifierNode {
    override fun ContentDrawScope.draw() { /* ... */; drawContent() }
}
```

See `performance-patterns.md` for the full `Modifier.Node` recipe.

## Side Effects

| Deprecated / risky | Modern |
|---|---|
| `LaunchedEffect(Unit) { ... }` for view-lifecycle work | `LifecycleStartEffect(Unit) { onStopOrDispose { ... } }` |
| `LaunchedEffect(Unit) { ... }` that depends on a value | `LaunchedEffect(realKey) { ... }` |
| `rememberCoroutineScope()` and launching from a `LaunchedEffect` body | Use the `LaunchedEffect` scope directly |
| `DisposableEffect` without `onDispose` | Always terminate with `onDispose { }` |

## Insets and Edge-to-Edge

```kotlin
// Deprecated — setDecorFitsSystemWindows + hardcoded status-bar padding
WindowCompat.setDecorFitsSystemWindows(window, false)

// Modern — handles API 35+ forced edge-to-edge automatically
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent { App() }
}
```

Inside composables:

| Deprecated | Modern |
|---|---|
| `Modifier.statusBarsPadding() + navigationBarsPadding()` | `Modifier.systemBarsPadding()` or `Modifier.safeDrawingPadding()` |
| Manual `WindowInsetsCompat` reads | `WindowInsets.systemBars` / `.ime` / `.safeDrawing` |
| Scaffold body ignoring `innerPadding` | Always propagate `innerPadding` |

See `edge-to-edge.md`.

## Back Navigation

| Deprecated / incomplete | Modern |
|---|---|
| `OnBackPressedDispatcher` manual wiring | `BackHandler { }` in composables |
| `BackHandler` alone on Android 14+ | `PredictiveBackHandler { progress -> ... }` when you want the swipe animation |
| No back handling on custom sheets | `ModalBottomSheet` now routes predictive back |

`android:enableOnBackInvokedCallback="true"` is default in the Compose Activity template as of BOM 2025.06+. See `predictive-back.md`.

## Lists

| Deprecated / buggy | Modern |
|---|---|
| `LazyColumn { items(list) { ... } }` (no key) | `items(list, key = { it.id }) { ... }` |
| `Modifier.animateItemPlacement()` | `Modifier.animateItem()` (covers placement, appearance, disappearance) |
| `stickyHeader { }` without a stable key | `stickyHeader(key = ...) { }` |

## Layout Callbacks

```kotlin
// Older — fires on every layout pass in the subtree
Modifier.onGloballyPositioned { coords -> /* ... */ }

// Modern — fires only when this node is placed
Modifier.onPlaced { coords -> /* ... */ }
Modifier.onSizeChanged { size -> /* ... */ }
```

`onGloballyPositioned` is still correct when you truly need descendant coordinates; for self-coordinates prefer `onPlaced` / `onSizeChanged`.

## Animations

| Deprecated | Modern |
|---|---|
| `Modifier.animateContentSize()` inside a `LazyColumn` item | `Modifier.animateItem()` (list context) |
| `AnimatedVisibility` with `initiallyVisible = true` flicker workaround | Current `AnimatedVisibility` hoists initial state correctly; remove the workaround |
| Manual shared element via `Modifier.onGloballyPositioned` + `graphicsLayer` | `SharedTransitionLayout { ... Modifier.sharedElement(...) }` (stable in 1.8) |

See `animation.md`.

## Other Renames

- `Modifier.size(...)` — the `Dp.Unspecified` fallback path was removed; pass a real size.
- `rememberPagerState { pageCount }` — the new trailing-lambda form replaces the positional `pageCount = ...` parameter.
- `BottomSheetScaffold` in Material 3 replaces the Material 2 `BottomSheetScaffold`. Predictive back is wired automatically.
- `PullToRefreshBox` in Material 3 replaces the Accompanist `SwipeRefresh`. Accompanist pull-refresh is archived.
- `AnimatedContent(targetState, transitionSpec = { ... })` — the trailing `contentKey` parameter is the modern way to suppress animation for equivalent states.
- `Dialog(onDismissRequest = ...)` — `DialogProperties(usePlatformDefaultWidth = false)` is the current escape hatch for edge-to-edge dialogs.
