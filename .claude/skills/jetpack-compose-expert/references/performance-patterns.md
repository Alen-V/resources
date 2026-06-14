# Compose Recomposition and Performance Reference

## Table of Contents

- [Recomposition Model](#recomposition-model)
- [Strong Skipping Mode](#strong-skipping-mode)
- [Stability — Stable, Immutable, Unstable](#stability--stable-immutable-unstable)
- [Reading State in the Narrowest Scope](#reading-state-in-the-narrowest-scope)
- [Deferred State Reads with Lambdas](#deferred-state-reads-with-lambdas)
- [key() in Lazy Lists](#key-in-lazy-lists)
- [derivedStateOf](#derivedstateof)
- [Modifier.Node for Custom Modifiers](#modifiernode-for-custom-modifiers)
- [Measuring: Layout Inspector and Recomposition Counts](#measuring-layout-inspector-and-recomposition-counts)
- [Baseline Profiles](#baseline-profiles)

## Recomposition Model

A composable recomposes when:

1. State it reads changes, AND
2. The Compose runtime cannot skip it (its parameters changed, or it is non-skippable).

Strong Skipping Mode (default) makes nearly every composable skippable unless it is marked `@NonRestartableComposable` or `@NonSkippableComposable`. The remaining question is: when invoked, does the runtime **skip** (reuse prior output) or **re-execute**?

Skip condition: all parameters are `equals()` to the previous call. That requires stability.

## Strong Skipping Mode

On (default with Compose Compiler 1.5.4+), the rules are:

- Skippable by default: any composable whose parameters are all **stable or restartable**.
- Unstable parameters no longer automatically make a composable non-skippable — the runtime compares them with `==`.
- Lambdas are remembered by the compiler so identity stays stable across compositions unless they capture unstable state.

This does not make instability free. Comparing an unstable object with `==` still executes the composable if equality says "different," and many objects (List views, interfaces, generics) return `false` for structural equality when they shouldn't.

## Stability — Stable, Immutable, Unstable

| Category | Means | Examples |
|---|---|---|
| Stable | Equality contract holds; changes observable via `State<T>` | `Int`, `String`, `ImmutableList`, `MutableState<T>`, anything `@Stable` |
| Immutable | Never changes after construction | primitives, `String`, `@Immutable` data classes |
| Unstable | Can change without notification; compiler cannot trust `==` | `List<T>`, `Map<K, V>`, `var` properties, interfaces, generics |

Fix stability by:

```kotlin
// Option 1: mark your data class
@Immutable
data class Field(val id: String, val name: String, val boundary: ImmutableList<LatLng>)

// Option 2: switch collection type
import kotlinx.collections.immutable.ImmutableList
import kotlinx.collections.immutable.persistentListOf

val items: ImmutableList<String> = persistentListOf("a", "b")

// Option 3: accept the re-execution, but ensure downstream skippability
// (cheap composables don't need stability; hot paths do)
```

Generate the stability report to audit:

```
// build.gradle.kts (app)
composeCompiler {
    reportsDestination = layout.buildDirectory.dir("compose_reports")
    metricsDestination = layout.buildDirectory.dir("compose_metrics")
}
```

Then check `*-classes.txt` and `*-composables.txt` under `build/compose_reports/`.

## Reading State in the Narrowest Scope

The composable that reads state is the one that recomposes. Moving the read down the tree narrows the scope.

```kotlin
// Bad — Header recomposes every scroll pixel
@Composable
fun Screen() {
    val scroll = rememberScrollState()
    Column(Modifier.verticalScroll(scroll)) {
        Header(offset = scroll.value)
        Body()
    }
}

// Good — only the piece that actually needs the value reads it
@Composable
fun Screen() {
    val scroll = rememberScrollState()
    Column(Modifier.verticalScroll(scroll)) {
        Header(offsetProvider = { scroll.value })
        Body()
    }
}
```

## Deferred State Reads with Lambdas

Modifier lambdas like `graphicsLayer { ... }` and `Modifier.drawBehind { ... }` defer state reads to the draw phase, not the composition phase. Reads inside them trigger a draw invalidation, not recomposition.

```kotlin
// Recomposes the Box on every frame of an animation
val scale by animateFloatAsState(if (pressed) 0.95f else 1f, label = "")
Box(Modifier.graphicsLayer(scaleX = scale, scaleY = scale))

// Reads `scale` only during draw — no recomposition
Box(Modifier.graphicsLayer {
    scaleX = scale
    scaleY = scale
})
```

Same pattern for offsets:

```kotlin
// Phase: composition — recomposes the caller
Modifier.offset(x = scrollOffset.dp)

// Phase: layout — no recomposition
Modifier.offset { IntOffset(x = scrollOffset.roundToPx(), y = 0) }
```

Rule: if a `Modifier` extension has a lambda version, the lambda version is almost always the performance-correct choice for animated state.

## key() in Lazy Lists

`LazyColumn` / `LazyRow` use position as identity by default. Pass `key` so the list associates state with the real item, not the slot:

```kotlin
LazyColumn {
    items(fields, key = { it.id }) { field ->
        FieldRow(field)
    }
}
```

Without keys:

- Animations (`animateItem`) snap instead of glide.
- Local state inside `FieldRow` (expanded, scrolled) follows the index, not the data.
- Re-orders cause full visible-item recomposition.

For heterogeneous lists, also pass `contentType`:

```kotlin
LazyColumn {
    items(
        entries,
        key = { it.id },
        contentType = { it::class },
    ) { entry ->
        when (entry) {
            is Header -> HeaderRow(entry)
            is Field -> FieldRow(entry)
        }
    }
}
```

`contentType` lets the runtime reuse composition slots between items of the same type. Without it, heterogeneous lists re-inflate layout on every scroll.

## derivedStateOf

Collapses N state reads into 1 observed output. Right pattern: the inputs change often, the derived value rarely.

```kotlin
val listState = rememberLazyListState()
val isAtTop by remember {
    derivedStateOf { listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset == 0 }
}
```

Wrong pattern: wrapping a single, cheap, already-observed read:

```kotlin
// Pointless — just use `query` directly
val trimmed by remember { derivedStateOf { query.trim() } }
```

## Modifier.Node for Custom Modifiers

`Modifier.composed { ... }` allocates a new modifier every composition and forces its host composable to be non-skippable. Use `Modifier.Node`:

```kotlin
fun Modifier.pulse(enabled: Boolean): Modifier =
    this then PulseElement(enabled)

private data class PulseElement(val enabled: Boolean) : ModifierNodeElement<PulseNode>() {
    override fun create() = PulseNode(enabled)
    override fun update(node: PulseNode) { node.enabled = enabled }
    override fun InspectorInfo.inspectableProperties() {
        name = "pulse"; properties["enabled"] = enabled
    }
}

private class PulseNode(var enabled: Boolean) : Modifier.Node(), DrawModifierNode {
    override fun ContentDrawScope.draw() {
        if (enabled) { /* draw effect */ }
        drawContent()
    }
}
```

Benefits:

- Zero allocation per composition.
- Keeps the host composable skippable.
- `update(node)` path means parameter changes don't recreate the node.
- Access to lifecycle hooks (`onAttach`, `onDetach`), coroutines (`coroutineScope`), pointer input, focus, semantics — all from one node.

## Measuring: Layout Inspector and Recomposition Counts

Android Studio's Layout Inspector has a "Recomposition counts" column. Attach to a debug build, perform the interaction under test, and look for:

- Counts climbing on composables that should not be changing — usually a stability or scope problem.
- One count per frame on a composable tied to an animation — confirms the state read is at the composition phase; move it into a draw / layout lambda.

Programmatic logging for targeted debugging:

```kotlin
@Composable
fun FarmRow(farm: Farm) {
    SideEffect { Log.d("Recompose", "FarmRow(${farm.id})") }
    /* ... */
}
```

## Baseline Profiles

A `baselineprofile` module generates critical-path profiles that AOT-compile key composables on first launch. For any screen visible in the startup window or a hot navigation, ship a baseline profile; 20-40% frame-time improvements on the first interaction are typical.

```
// app/build.gradle.kts
dependencies {
    "baselineProfile"(project(":baselineprofile"))
}
```

Baseline profiles cannot compensate for algorithmic problems. Fix recomposition hot spots first, then regenerate the profile.
