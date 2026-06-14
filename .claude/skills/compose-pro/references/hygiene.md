# Code hygiene

File layout, imports, unused code, previews, lint cleanliness.


## File-per-type

- One top-level public type per file. A screen file may contain:
  - The public `@Composable fun HomeScreen(...)`.
  - Its stateless sibling `@Composable fun HomeScreen(state: HomeUiState, onEvent: (HomeEvent) -> Unit)`.
  - One or two private helper composables used only by this screen.
  - One `@Preview` (or a couple of previews) for the screen.
- Move to a new file as soon as a composable, sealed hierarchy, or data class is reused outside the file.
- Separate files for:
  - ViewModels (`HomeViewModel.kt`).
  - UI state (`HomeUiState.kt`, including sealed event types).
  - Reusable composables (`TaskRow.kt`).
- Flag files that bundle multiple top-level screens, multiple unrelated data classes, or a ViewModel plus its screen in one file (exception: very small demo/sample modules).


## Package structure

Organise by feature, then by layer:

```
feature-home/
    ui/
        HomeScreen.kt
        HomeViewModel.kt
        HomeUiState.kt
        component/
            TaskRow.kt
    domain/
        Task.kt
        GetTasksUseCase.kt
    data/
        TaskRepository.kt
        TaskDao.kt
```

- Avoid global `ui/`, `domain/`, `data/` at the module root — that is layered-by-type, which scales poorly.
- Package names are lowercase, no underscores.


## Imports

- No wildcard imports for Compose (`androidx.compose.*`). Prefer explicit imports; IDE settings should keep `androidx.compose` packages explicit.
- Star imports for `import androidx.compose.material3.*` hide which APIs a file uses and increase diff noise on renames.
- Order: stdlib / kotlinx → androidx → third-party → project. Keep the IDE's default Kotlin order unless the project specifies otherwise.


## Unused parameters and state

- Flag `modifier: Modifier = Modifier` parameters that are never applied — the caller's modifier is silently dropped.
- Flag `remember { mutableStateOf(...) }` where the state is read but never written (or vice versa).
- Flag `LaunchedEffect` blocks that never reference their key — they should be `LaunchedEffect(Unit)` with a comment, or more likely the effect shouldn't exist.
- Flag unused `@Preview` functions with no body.


## Previews

- Every public, non-trivial composable should have at least one `@Preview`.
- Previews must be `private` — they are tooling-only and should never be called from app code.
- Previews for screens should not take a ViewModel (see `references/views.md`).
- Use `@PreviewLightDark`, `@PreviewFontScale`, `@PreviewScreenSizes` to cover themes and scales.


## Explicit return types

- Public API should declare return types explicitly:

```kotlin
// Before
fun buildTasks() = listOf(
    Task("a"),
    Task("b"),
)

// After (public in a library module)
fun buildTasks(): List<Task> = listOf(
    Task("a"),
    Task("b"),
)
```

- Inferred return types are fine for `private` and `internal` functions.


## ktlint / detekt

- Run ktlint or detekt as part of the build if configured. Both issue warnings for many of the patterns in this skill automatically.
- Do not disable rules file-wide to suppress a single issue; use an inline `// ktlint-disable <rule>` or `@Suppress("...")` at the call site with a reason.


## Logging

- Prefer a shared `Logger` or `Timber` instance; avoid `println` and `Log.d` in production code (Log statements leak in release builds unless stripped).
- Never log PII, tokens, or raw user input.


## Secrets and configuration

- Never commit API keys, signing secrets, or tokens. Use `local.properties`, Gradle build configs, or a dedicated secrets plugin.
- Manifests should not contain secrets that will ship to devices.


## Tests

- Unit tests belong in `src/test/kotlin/`; instrumented tests in `src/androidTest/kotlin/`.
- Prefer unit tests for ViewModels and domain logic (with `TestDispatcher` / `runTest`).
- Use instrumented tests only for things requiring a real `Context` or Compose UI tree that can't be faked.


## Review checklist

- One top-level public type per file; screens may include their private helpers and a preview.
- Package structure is feature-first, not layer-first.
- No wildcard imports in Compose files.
- `modifier` parameter is always applied to the outer layout node.
- No unused `remember`, `LaunchedEffect`, or `@Preview` blocks.
- Public, non-trivial composables have at least one `@Preview`; previews are `private`.
- Public library APIs declare explicit return types and visibility.
- ktlint / detekt passes; suppressions are localised and annotated with a reason.
- No PII, tokens, or secrets in log statements, manifests, or source.
- Unit tests exist for ViewModels and domain logic; UI tests reserved for what unit tests cannot cover.
