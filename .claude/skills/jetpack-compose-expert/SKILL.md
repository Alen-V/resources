---
name: jetpack-compose-expert
description: Write, review, or improve Jetpack Compose code following best practices for state management, composition, recomposition performance, Material 3 Expressive, predictive back, edge-to-edge, accessibility, and modern Compose APIs (BOM 2026.02+). Use when building new Compose features, refactoring existing @Composable functions, or adopting modern Compose patterns.
---

# Jetpack Compose Expert Skill

## Operating Rules

- Consult `references/latest-apis.md` at the start of every task to avoid deprecated APIs and Material 2 leftovers
- Assume Compose BOM `2026.02.x`, Compose Compiler with Strong Skipping Mode on, Kotlin 2.2.x (K2), Material 3 Expressive
- Prefer native Compose APIs over `AndroidView` interop unless a View-world widget is truly required
- Focus on correctness, recomposition cost, and lifecycle-safety; do not enforce a specific architecture (MVI / MVVM / Redux)
- Encourage separating UI state from composables for testability without mandating a specific pattern
- Follow Material 3 guidance and Android platform UX expectations (predictive back, edge-to-edge, TalkBack)
- Present performance optimizations as suggestions when they are not user-visible; flag the ones that ARE user-visible (dropped frames, stutter) as required
- Gate version-sensitive behaviour (predictive back callbacks, edge-to-edge defaults, dynamic color) with `Build.VERSION.SDK_INT` checks where the API surface changes

## Task Workflow

### Review existing Compose code
- Read the composable(s) under review and identify which topics apply
- Flag deprecated APIs and Material 2 imports (compare against `references/latest-apis.md`)
- Run the Topic Router below for each relevant topic
- Check recomposition hazards: unstable parameters, bare `collectAsState()`, missing `key` on `LazyColumn` items, state read too high in the tree
- Validate lifecycle-awareness: `collectAsStateWithLifecycle`, `LifecycleStartEffect`, `DisposableEffect` cleanup
- Validate predictive back + edge-to-edge handling on Android 14+ / 15+ targets

### Improve existing Compose code
- Audit current implementation against the Topic Router topics
- Replace deprecated APIs with modern equivalents from `references/latest-apis.md`
- Hoist state above the composable that reads it; push state reads into lambdas (`Modifier.drawBehind`, `graphicsLayer { ... }`) when it prevents recomposition of parents
- Make model classes `@Immutable` / `@Stable` when Strong Skipping cannot infer stability (generics, interfaces, `List<T>` backed by `ArrayList`)
- Replace `Modifier.composed { }` custom modifiers with `Modifier.Node`
- Replace manual `BackHandler` + `enableEdgeToEdge()` omissions with the current platform defaults

### Implement new Compose feature
- Design state ownership first: what's owned by the `ViewModel`, what's owned by `remember`, what's hoisted from the caller
- Expose state as immutable `StateFlow<UiState>` from the `ViewModel`, collect with `collectAsStateWithLifecycle()`
- Shape composables around slot APIs (`content: @Composable () -> Unit`) for reuse
- Apply Material 3 Expressive components + `MaterialTheme` tokens; avoid hardcoded colors / typography
- Add `Modifier.semantics { }` for custom interactive elements; use `Role.Button`, `contentDescription`, and merge descendants where appropriate
- Enable `enableEdgeToEdge()` in the activity and handle `WindowInsets` in the scaffold
- Verify `LazyColumn` items have stable `key` and heterogeneous lists declare `contentType`

### Topic Router

Consult the reference file for each topic relevant to the current task:

| Topic | Reference |
|-------|-----------|
| Deprecated API lookup | `references/latest-apis.md` |
| State management | `references/state-management.md` |
| Composition patterns | `references/composition.md` |
| Recomposition performance | `references/performance-patterns.md` |
| Side effects and coroutines | `references/side-effects.md` |
| Material 3 Expressive | `references/material3.md` |
| Lazy lists and grids | `references/lists.md` |
| Animation | `references/animation.md` |
| Predictive back | `references/predictive-back.md` |
| Edge-to-edge and insets | `references/edge-to-edge.md` |
| Accessibility | `references/accessibility.md` |

## Correctness Checklist

These are hard rules -- violations are always bugs:

- [ ] `mutableStateOf(...)` is always wrapped in `remember { }` (or `rememberSaveable { }`) -- never bare inside a composable body
- [ ] `collectAsStateWithLifecycle()` is used on Android (not `collectAsState()`) when collecting `Flow` / `StateFlow`
- [ ] `LazyColumn` / `LazyRow` / `LazyVerticalGrid` items pass a stable `key = { ... }`; heterogeneous lists also pass `contentType`
- [ ] State is hoisted above the composable that reads it when the caller needs to observe or override it
- [ ] `@Composable` functions returning `Unit` are `PascalCase`; value-producing `@Composable` functions are `camelCase`
- [ ] `modifier: Modifier = Modifier` is the first optional parameter and is forwarded to the single root layout
- [ ] `LaunchedEffect` keys are the real dependencies, not `Unit`, unless "run exactly once for the composition" is truly intended
- [ ] `DisposableEffect` returns `onDispose { }` that releases every listener / callback it registered
- [ ] Custom modifiers use `Modifier.Node` (not `Modifier.composed { }`)
- [ ] No Material 2 imports (`androidx.compose.material.*`) in a Material 3 codebase; use `androidx.compose.material3.*`
- [ ] Activity calls `enableEdgeToEdge()` before `setContent { }` and the UI honours `WindowInsets` via `Scaffold` or `Modifier.windowInsetsPadding`
- [ ] Predictive back: system back is handled via `PredictiveBackHandler` or `BackHandler`; custom navigation does not silently swallow back on Android 14+
- [ ] Data classes exposed as Compose parameters are `@Immutable` or contain only stable types; otherwise they are accepted to defeat Strong Skipping
- [ ] Interactive composables have a `Role` and a meaningful `contentDescription` / text label for TalkBack
- [ ] `rememberSaveable` is used for state that must survive process death and configuration changes

## References

- `references/latest-apis.md` -- **Read first for every task.** Deprecated-to-modern API swap table
- `references/state-management.md` -- `remember`, `rememberSaveable`, `mutableStateOf`, `derivedStateOf`, hoisting, `ViewModel` + `StateFlow`
- `references/composition.md` -- Slot APIs, `CompositionLocal`, naming, parameter ordering, `@Composable` lambdas
- `references/performance-patterns.md` -- Recomposition, Strong Skipping Mode, stability, `key()`, scope narrowing, `Modifier.Node`
- `references/side-effects.md` -- `LaunchedEffect`, `DisposableEffect`, `SideEffect`, `produceState`, `snapshotFlow`, lifecycle effects
- `references/material3.md` -- Material 3 Expressive components, theming, adaptive layouts, `NavigationSuiteScaffold`, motion schemes
- `references/lists.md` -- `LazyColumn` / `LazyRow` / `LazyVerticalGrid`, keys, `contentType`, `animateItemPlacement`
- `references/animation.md` -- `animate*AsState`, `AnimatedVisibility`, `AnimatedContent`, `SharedTransitionLayout`, `Animatable`
- `references/predictive-back.md` -- `PredictiveBackHandler`, `BackHandler`, NavController integration, bottom sheet back
- `references/edge-to-edge.md` -- `enableEdgeToEdge()`, `WindowInsets`, `Scaffold` insets, IME / keyboard handling
- `references/accessibility.md` -- `semantics { }`, `contentDescription`, `Role`, merge / clear descendants, live regions
