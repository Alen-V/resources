---
name: android-architecture
description: Architecture patterns and infrastructure for Android apps -- dependency injection (Hilt/Koin), Navigation-Compose, Room/DataStore persistence, WorkManager, lifecycle-aware coroutines, modularization, and testing. Use when structuring an Android app, adding a feature module, wiring DI, designing navigation graphs, or setting up data/persistence layers.
---

# Android Architecture Skill

This skill covers the infrastructure layer that Jetpack Compose (UI) and Kotlin (language) skills deliberately skip: DI graphs, navigation, persistence, background work, lifecycle, modularization, and test setup. Pair with `jetpack-compose-expert` for UI, `kotlin-idioms` for language features, and `maplibre-android-stadia` for maps.

Assumes Kotlin 2.2.x (K2), AGP 8.9+, `minSdk 26`, `targetSdk 36` (Android 16), KSP over KAPT throughout.

## Operating Rules

- **Unidirectional data flow is the default.** UI emits events upward; `ViewModel` holds state as `StateFlow<UiState>`; UI observes via `collectAsStateWithLifecycle()`. Do not recommend bidirectional bindings.
- **Single-Activity architecture.** One `MainActivity` hosts the Compose `NavHost`. Do not add new Activities unless a true OS boundary demands it (share sheets, picker intents, system launchers).
- **Never hold `Context` in a `ViewModel`.** If truly required, inject `Application` via Hilt (`@ApplicationContext`) and be explicit. Prefer moving the `Context`-needing code into a repository or use-case layer.
- **Process death is a first-class concern.** `SavedStateHandle` for ephemeral UI state (scroll position, form drafts, selected tab). DataStore/Room for anything that must outlive the process.
- **Feature modules over layer modules** once you exceed ~three features. `:feature:home`, `:feature:settings` scale; `:ui`, `:data`, `:domain` as top-level modules collapse into bottlenecks.
- **Do not mandate a single architecture pattern.** UDF is the baseline. MVI, MVVM, and Redux-style reducers are all valid on top of UDF. Present tradeoffs (see `references/architecture-patterns.md`), let the user decide.
- **KSP everywhere.** Hilt, Room, Moshi, and any other annotation processor runs via KSP. KAPT is deprecated under K2 -- never set it up on a new project.
- **Test at the right layer.** ViewModels and repositories with Robolectric + `runTest`; Compose UI with `createAndroidComposeRule`; full flows with instrumented tests. Do not bury business logic where only an instrumented test can reach it.
- **Gradle sync time is a signal.** Slow syncs usually mean bad module graph (cycles, over-coupled `:app`, `kapt` leftover). See `references/modularization.md`.

## Task Workflow

### Set up a new feature module
- Decide ownership: is it one feature, or does core/design/data need extension first?
- Scaffold `:feature:<name>` with `api` exports for navigation routes only; everything else `implementation`
- Wire DI: a `@Module @InstallIn(SingletonComponent::class)` inside the feature module, consumed by `:app`
- Add the feature's nav graph as a top-level extension on `NavGraphBuilder`; `:app` calls it from the root `NavHost`
- ViewModel scoped via `@HiltViewModel`; collect state with `collectAsStateWithLifecycle()`

### Add persistence (Room or DataStore)
- Decide: tabular/relational/queryable -> Room. Key-value, typed settings -> DataStore (Preferences for ad-hoc, Proto for schema'd).
- Put schemas in `:core:data` (or a dedicated `:data:<name>`). UI modules never import Room or DataStore directly.
- Expose `Flow<T>` from DAOs/DataStore; wrap in a `Repository` that maps to domain models
- Export Room schemas (`room.schemaLocation`) for migration tests; write `MigrationTestHelper` tests for every migration
- For DataStore, provide a single `DataStore<T>` instance via DI (`@Singleton`); never call `preferencesDataStore` inside a composable

### Wire navigation
- Use type-safe routes with `@Serializable` destination classes (Navigation-Compose 2.8+)
- Define routes in the feature module; expose them through `api` for cross-module deep linking
- Auth gating: a single `LaunchedEffect` observing auth state, `popBackStack` on sign-out, `navigate(...) { popUpTo(0) }` on sign-in
- Deep links declared on the destination, not the caller

### Add background work
- `CoroutineWorker` + Hilt integration (`@HiltWorker` + `HiltWorkerFactory`)
- Decide one-time vs periodic; declare constraints explicitly (`NetworkType.CONNECTED`, `requiresCharging`)
- Use `enqueueUniqueWork` / `enqueueUniquePeriodicWork` with `ExistingWorkPolicy.KEEP` by default to avoid duplicate runs
- Expose progress via `WorkManager.getWorkInfosByTagFlow(...)` to UI; do not reach into `WorkInfo.State` directly

### Add a test
- ViewModel/repository: Robolectric + `runTest` + Turbine + MockK
- Compose UI: `createAndroidComposeRule<HiltTestActivity>()` with `@HiltAndroidTest` and `@UninstallModules` for fakes
- Navigation: `TestNavHostController` + `composeTestRule.setContent`
- Do not write an instrumented test for logic that has no Android dependency -- move it to a `:core:*` JVM module instead

## Topic Router

Consult the reference file for each topic relevant to the current task:

| Topic | Reference |
|-------|-----------|
| Dependency injection (Hilt) | `references/di-hilt.md` |
| Dependency injection (Koin) | `references/di-koin.md` |
| Navigation-Compose | `references/navigation-compose.md` |
| Room database | `references/room.md` |
| DataStore (Preferences / Proto) | `references/datastore.md` |
| WorkManager background work | `references/workmanager.md` |
| Lifecycle-aware coroutines | `references/lifecycle.md` |
| Architecture patterns (UDF / MVI / MVVM) | `references/architecture-patterns.md` |
| Modularization | `references/modularization.md` |
| Testing | `references/testing.md` |

## Correctness Checklist

These are hard rules -- violations are always bugs:

- [ ] No `Context`, `Activity`, or `View` references inside a `ViewModel`
- [ ] No Room DAO call inside a composable -- always via a repository collected through a `ViewModel`
- [ ] `Flow` collection in UI uses `collectAsStateWithLifecycle()` or `flowWithLifecycle`
- [ ] `WorkManager` unique work uses a stable name; `ExistingWorkPolicy` is explicit, not defaulted
- [ ] Every Room `Migration` has a test via `MigrationTestHelper`
- [ ] Schema export path (`room.schemaLocation`) is configured before the first migration
- [ ] KSP is used for Hilt/Room/Moshi; no `kotlin-kapt` plugin in new modules
- [ ] `@HiltViewModel` constructors take Hilt-provided dependencies only; no manual `ViewModelProvider.Factory`
- [ ] Navigation routes are `@Serializable` objects/classes (type-safe); no string-based routes in new code
- [ ] Feature modules do not import from `:app`; `:app` imports from features
- [ ] `api` visibility is only used for types that cross module boundaries (navigation routes, public domain models)

## References

- `references/di-hilt.md` -- Hilt setup, scopes, assisted injection, `@EntryPoint`, test uninstallation
- `references/di-koin.md` -- Koin 4.x DSL, Compose integration, module composition, `checkModules` testing
- `references/navigation-compose.md` -- Type-safe routes, nested graphs, deep links, dialog/bottom-sheet destinations
- `references/room.md` -- Entity/DAO patterns, Flow returns, migrations, schema export, paging
- `references/datastore.md` -- Preferences vs Proto, serializer setup, SharedPreferences migration
- `references/workmanager.md` -- `CoroutineWorker`, expedited work, chaining, Hilt integration, observability
- `references/lifecycle.md` -- `viewModelScope`, `repeatOnLifecycle`, Compose lifecycle effects, process lifecycle
- `references/architecture-patterns.md` -- UDF / MVI / MVVM tradeoffs, repositories, use cases, result types
- `references/modularization.md` -- Module boundaries, convention plugins, version catalog, `api` vs `implementation`
- `references/testing.md` -- `runTest`, Turbine, MockK, Hilt test rules, Compose UI tests, screenshot testing
