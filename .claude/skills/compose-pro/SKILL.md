---
name: compose-pro
description: Comprehensively reviews Jetpack Compose and Kotlin code for best practices on modern APIs, recomposition performance, state management, accessibility, and maintainability. Use when reading, writing, or reviewing Compose-based Android projects.
---

Review Kotlin and Compose code for correctness, modern API usage, and adherence to project conventions. Report only genuine problems — do not nitpick or invent issues.

Review process:

1. Check for deprecated API using `references/api.md`.
1. Check that composables, modifiers, and recomposition have been written optimally using `references/views.md`.
1. Validate that data flow and state management are configured correctly using `references/state.md`.
1. Ensure navigation is type-safe and predictive-back-ready using `references/navigation.md`.
1. Ensure the code uses designs that are accessible and compliant with Material Design 3 using `references/design.md`.
1. Validate accessibility compliance including TalkBack, dynamic text, and reduced motion using `references/accessibility.md`.
1. Ensure the code runs efficiently without unnecessary recomposition using `references/performance.md`.
1. Quick validation of Kotlin code using `references/kotlin.md`.
1. Final code hygiene check using `references/hygiene.md`.

If doing a partial review, load only the relevant reference files.


## Core Instructions

- Android 16 (API 36) exists and is the default target SDK for new apps; compile against the latest stable.
- Target Kotlin 2.2 or later with the K2 compiler, modern coroutines, and `StateFlow`-based data flow.
- Assume Compose BOM 2026.02.x with Material3 1.4+. Strong Skipping Mode is on by default.
- The user is a Compose developer — avoid the XML View system, `Fragment`, or `AppCompatActivity` unless explicitly requested.
- Do not introduce third-party frameworks (Hilt, Koin, Coil, Accompanist shims, etc.) without asking first.
- Break different composables, data classes, and sealed hierarchies into separate Kotlin files rather than stuffing multiple top-level declarations into one file.
- Use a consistent project structure organized by feature (`:feature-home`, `:feature-settings`) rather than by layer (`:ui`, `:data`, `:domain` at the root). Layered subpackages within a feature module are fine.


## Output Format

Organize findings by file. For each issue:

1. State the file and relevant line(s).
2. Name the rule being violated (e.g., "Use `collectAsStateWithLifecycle()` instead of `collectAsState()` in Android Compose").
3. Show a brief before/after code fix.

Skip files with no issues. End with a prioritized summary of the most impactful changes to make first.

Example output:

### HomeScreen.kt

**Line 18: Use `collectAsStateWithLifecycle()` instead of `collectAsState()` in Android Compose.**

```kotlin
// Before
val state by viewModel.uiState.collectAsState()

// After
val state by viewModel.uiState.collectAsStateWithLifecycle()
```

**Line 44: Stable key missing from `LazyColumn` items — will force full recomposition on reorder.**

```kotlin
// Before
LazyColumn {
    items(tasks) { task ->
        TaskRow(task)
    }
}

// After
LazyColumn {
    items(tasks, key = { it.id }) { task ->
        TaskRow(task)
    }
}
```

**Line 61: Avoid `Modifier.composed {}` — use `Modifier.Node` via a `ModifierNodeElement`.**

```kotlin
// Before
fun Modifier.tint(color: Color) = composed {
    val alpha by animateFloatAsState(1f)
    drawWithContent { drawContent(); drawRect(color.copy(alpha = alpha)) }
}

// After
fun Modifier.tint(color: Color) = this.then(TintElement(color))

private data class TintElement(val color: Color) : ModifierNodeElement<TintNode>() {
    override fun create() = TintNode(color)
    override fun update(node: TintNode) { node.color = color }
}
```

### Summary

1. **Performance (high):** Missing `LazyColumn` key on line 44 causes full recomposition on every list change.
2. **Lifecycle (high):** `collectAsState()` on line 18 keeps collecting while the app is backgrounded; switch to `collectAsStateWithLifecycle()`.
3. **Modern API (medium):** `Modifier.composed {}` on line 61 defeats Strong Skipping — convert to `Modifier.Node`.

End of example.


## References

- `references/accessibility.md` — TalkBack, semantics, dynamic text, reduced motion, and other accessibility requirements.
- `references/api.md` — updating code for modern Compose and Android API, and the deprecated code it replaces.
- `references/design.md` — Material Design 3 and Material 3 Expressive, adaptive layouts, typography, dynamic color.
- `references/hygiene.md` — making code compile cleanly, stay one-type-per-file, and remain maintainable.
- `references/navigation.md` — type-safe Navigation-Compose 2.8+, predictive back, deep links, single-activity structure.
- `references/performance.md` — optimizing Compose for Strong Skipping Mode, stability, and low recomposition counts.
- `references/state.md` — state hoisting, `remember`/`rememberSaveable`, `StateFlow`, `derivedStateOf`, single source of truth.
- `references/kotlin.md` — modern Kotlin 2.2 idioms, coroutines, sealed hierarchies, structured concurrency.
- `references/views.md` — composable structure, slot APIs, modifier parameter order, animation correctness.
