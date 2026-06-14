# Compose Composition Patterns Reference

## Table of Contents

- [Composable Naming](#composable-naming)
- [Parameter Ordering](#parameter-ordering)
- [Slot APIs](#slot-apis)
- [Decoration Slots](#decoration-slots)
- [CompositionLocal](#compositionlocal)
- [Content Lambdas and @Composable Function Types](#content-lambdas-and-composable-function-types)
- [Modifier Parameter Contract](#modifier-parameter-contract)
- [Subview Extraction](#subview-extraction)

## Composable Naming

| Returns | Case | Example |
|---|---|---|
| `Unit` (emits UI) | PascalCase | `FieldRow`, `FarmCard` |
| Any value (factories, `remember*`, derived) | camelCase | `rememberLazyListState`, `textFieldColors` |

```kotlin
// Emits UI — PascalCase
@Composable
fun FarmHeader(farm: Farm, modifier: Modifier = Modifier) { /* ... */ }

// Produces a value — camelCase
@Composable
fun rememberFarmHeaderState(farm: Farm): FarmHeaderState { /* ... */ }
```

Exception: `Chip.Selected` / `Chip.Unselected` style enums as objects are **not** composables, just data — regular Kotlin rules apply.

## Parameter Ordering

1. Required data parameters (`farm`, `query`, `onClick`)
2. `modifier: Modifier = Modifier` — always first optional, always has default
3. Other optional parameters (`enabled`, `colors`, `contentPadding`)
4. Optional callbacks
5. `content: @Composable () -> Unit` — the trailing slot

```kotlin
@Composable
fun FarmCard(
    farm: Farm,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: CardColors = CardDefaults.cardColors(),
    content: @Composable ColumnScope.() -> Unit,
) { /* ... */ }
```

Rationale: the `modifier` default lets callers write `FarmCard(farm, onClick) { ... }` idiomatically; the trailing content slot enables Kotlin trailing-lambda syntax.

## Slot APIs

A slot is a `@Composable` lambda parameter the caller fills in. Prefer slots over boolean flags.

```kotlin
// Inflexible — forces one shape on every caller
@Composable
fun FarmRow(farm: Farm, showBadge: Boolean, badgeText: String?) { /* ... */ }

// Slot API — caller decides what goes there
@Composable
fun FarmRow(
    farm: Farm,
    modifier: Modifier = Modifier,
    trailing: @Composable () -> Unit = {},
) {
    Row(modifier) {
        Text(farm.name, Modifier.weight(1f))
        trailing()
    }
}

// Call sites
FarmRow(farm) { Badge { Text("New") } }
FarmRow(farm) { Icon(Icons.Default.ChevronRight, null) }
FarmRow(farm)
```

For slots that need layout context, receive the scope:

```kotlin
@Composable
fun FarmCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(modifier) { Column(Modifier.padding(16.dp)) { content() } }
}

FarmCard {
    Text("Title")
    Spacer(Modifier.weight(1f))   // `weight` is a ColumnScope extension
    Text("Footer")
}
```

## Decoration Slots

Material 3 components expose multiple named slots to keep structure flexible without proliferating booleans:

```kotlin
Scaffold(
    topBar = { TopAppBar(title = { Text("Farms") }) },
    bottomBar = { NavigationBar { /* ... */ } },
    floatingActionButton = { FloatingActionButton(onClick = {}) { Icon(Icons.Default.Add, null) } },
    snackbarHost = { SnackbarHost(snackbarHostState) },
    content = { innerPadding ->
        FarmsList(modifier = Modifier.padding(innerPadding))
    },
)
```

Do not shove these into a single `content` slot manually — `Scaffold` wires inset handling, elevation overlays, and motion between them.

## CompositionLocal

A `CompositionLocal` is ambient state, implicitly available to descendants. Use it for cross-cutting concerns that would otherwise require drilling through every layer: themes, density, activity, analytics sink, etc.

`staticCompositionLocalOf` vs `compositionLocalOf`:

| API | Behaviour | Use when |
|---|---|---|
| `compositionLocalOf` | Reads participate in recomposition; only readers recompose on change | Values change during runtime (e.g., theme toggle) |
| `staticCompositionLocalOf` | Reads do **not** participate in snapshot tracking; the entire subtree recomposes on change | Values never change (activity, dispatchers) or change rarely and reads are pervasive |

```kotlin
val LocalAnalytics = staticCompositionLocalOf<Analytics> {
    error("LocalAnalytics not provided")
}

@Composable
fun App(analytics: Analytics, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalAnalytics provides analytics) {
        content()
    }
}

@Composable
fun TrackedButton(event: String, onClick: () -> Unit) {
    val analytics = LocalAnalytics.current
    Button(onClick = { analytics.log(event); onClick() }) { /* ... */ }
}
```

Do not use `CompositionLocal` for screen-level state. It hides data flow and makes composables hard to test in isolation. Thread parameters explicitly unless the value is truly ambient.

## Content Lambdas and @Composable Function Types

A `@Composable` function type is a distinct type from a regular function type.

```kotlin
// These are NOT the same type
val a: () -> Unit = {}
val b: @Composable () -> Unit = {}
```

Stored as a parameter, a `@Composable () -> Unit` is Compose-tracked: the caller decides when it is invoked, and the callee can invoke it multiple times or skip it.

```kotlin
@Composable
fun IfExpanded(
    expanded: Boolean,
    content: @Composable () -> Unit,
) {
    if (expanded) content()
}
```

## Modifier Parameter Contract

A composable must:

1. Accept exactly one `modifier: Modifier = Modifier` parameter.
2. Apply it to the **root** layout node.
3. Apply internal modifiers (`.padding(16.dp)`, `.background(...)`) **after** the external modifier so the caller's constraints win.

```kotlin
// Correct — external modifier first, internal styling after
@Composable
fun FarmTile(farm: Farm, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .padding(16.dp),
    ) { Text(farm.name) }
}
```

Never fork the modifier into multiple children, and never ignore it. Each is an information leak the caller cannot fix.

## Subview Extraction

Extract a subcomposable when:

- A section is reused elsewhere.
- The parent exceeds ~100 lines and has natural structural groups.
- A subtree reads state the parent doesn't — extracting lets that state live closer to its readers and narrows recomposition scope.

Do not extract mechanically. One-line helpers (`@Composable fun Spacer8() = Spacer(Modifier.height(8.dp))`) are usually net noise; use `Spacer(Modifier.height(8.dp))` inline, or define the dimension as a theme token.

```kotlin
// Before — 180 line @Composable fun FarmScreen()
@Composable
fun FarmScreen(ui: FarmUiState) {
    Scaffold(
        topBar = { /* 40 lines */ },
        content = { padding ->
            Column(Modifier.padding(padding)) {
                // 50 line header
                // 40 line list
                // 20 line footer
            }
        },
    )
}

// After
@Composable
fun FarmScreen(ui: FarmUiState) {
    Scaffold(
        topBar = { FarmTopBar(ui.title) },
        content = { padding ->
            Column(Modifier.padding(padding)) {
                FarmHeader(ui.header)
                FarmList(ui.fields)
                FarmFooter(ui.footer)
            }
        },
    )
}
```

See `performance-patterns.md` for how subview extraction interacts with recomposition scope.
