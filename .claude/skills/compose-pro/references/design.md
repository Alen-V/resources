# Material Design 3, Expressive, and adaptive layouts

Compose apps target Material Design 3 (`androidx.compose.material3.*`). Material 3 Expressive shipped with Material3 1.4+ and introduces additional motion primitives and component shapes.


## Theme setup

A single root `AppTheme { ... }` wraps the whole app and configures:

- `ColorScheme` — usually dynamic (`dynamicLightColorScheme(context)` / `dynamicDarkColorScheme(context)` on API 31+), with fallbacks for older devices.
- `Typography` — built from `Typography()` with optional overrides.
- `Shapes` — `Shapes(extraSmall, small, medium, large, extraLarge)`.
- `MotionScheme` — `MotionScheme.expressive()` or `MotionScheme.standard()` (Material 3 Expressive).

```kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(LocalContext.current)
            else dynamicLightColorScheme(LocalContext.current)
        darkTheme -> darkColorScheme()
        else -> lightColorScheme()
    }
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        motionScheme = MotionScheme.expressive(),
        content = content,
    )
}
```

- Every composable that reads color or typography must go through `MaterialTheme.colorScheme` or `MaterialTheme.typography`. Hard-coded `Color(0xFF...)` values are a flag unless they are clearly brand tokens defined once in the theme file.


## Color roles

Use color *roles*, not specific hues:

- Surface / background: `colorScheme.surface`, `surfaceContainer`, `surfaceContainerHigh`, `background`.
- Content: `onSurface`, `onSurfaceVariant`, `onBackground`.
- Accent: `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`.
- Semantic: `error`, `onError`, `errorContainer`, `onErrorContainer`.

A `Surface` or `Card` should derive its content color automatically via `onX` pairings. Flag cases where `Text(color = Color.White)` is forced inside a `Surface` — it breaks dark mode and high-contrast modes.


## Typography

- Use `MaterialTheme.typography.*` scales: `displayLarge`, `headlineMedium`, `titleLarge`, `bodyMedium`, `labelSmall`, etc.
- Never set `fontSize = 14.sp` directly on `Text` unless explicitly building a non-Material component.
- Use `LocalContentColor` for non-Material surfaces so text inherits the ambient color.

```kotlin
// Before
Text("Heading", fontSize = 20.sp, fontWeight = FontWeight.Bold)

// After
Text("Heading", style = MaterialTheme.typography.titleLarge)
```


## Touch targets

- Interactive components must be at least 48dp x 48dp. Use `Modifier.minimumInteractiveComponentSize()` for custom clickable elements.
- `IconButton` enforces this by default. Custom `Modifier.clickable` on a small `Icon` does not.

```kotlin
// Before — 24dp tap target
Icon(
    Icons.Default.Close,
    contentDescription = "Close",
    modifier = Modifier.clickable { onDismiss() },
)

// After
IconButton(onClick = onDismiss) {
    Icon(Icons.Default.Close, contentDescription = "Close")
}
```


## Shape

- Material 3 Expressive introduces asymmetric and morphing shapes. Default shapes are `MaterialTheme.shapes.small` (8dp), `medium` (12dp), `large` (16dp).
- Prefer theme shapes over hard-coded `RoundedCornerShape(12.dp)`.


## Elevation and tonal elevation

- Material 3 uses **tonal elevation** (colour shift) by default, not drop shadows.
- `Surface(tonalElevation = 3.dp)` tints the surface. A drop shadow requires `shadowElevation`.
- Avoid stacking `Modifier.shadow` on a `Card` — `Card` already manages its own elevation.


## Adaptive layouts

Modern Compose apps respond to window size classes:

```kotlin
val windowSize = calculateWindowSizeClass(this)

when (windowSize.widthSizeClass) {
    WindowWidthSizeClass.Compact -> PhoneLayout()
    WindowWidthSizeClass.Medium -> FoldableLayout()
    WindowWidthSizeClass.Expanded -> TabletLayout()
}
```

- For nav chrome adapting across phone / tablet / foldable, use `NavigationSuiteScaffold`. It automatically picks `NavigationBar` (compact), `NavigationRail` (medium), or `PermanentNavigationDrawer` (expanded).
- Flag hard-coded `width = 360.dp` or `if (isTablet) ...` boolean forks; prefer window size classes.


## Edge-to-edge

On API 35+ edge-to-edge is default. Apps are drawn under system bars unless opted out.

- `WindowCompat.setDecorFitsSystemWindows(window, false)` is no longer needed on API 35+; it is implicit.
- Apply `Modifier.windowInsetsPadding(WindowInsets.systemBars)` or use `Scaffold` which consumes insets automatically.
- For `LazyColumn`, pass `contentPadding = WindowInsets.navigationBars.asPaddingValues()` so the last item clears the nav bar.
- Flag any `statusBarColor = Color.Transparent.toArgb()` / `navigationBarColor` writes in new code — use the Material3 `Surface` under the bars with `tonalElevation` instead.


## Material 3 Expressive

Shipped in Material3 1.4+:

- `MotionScheme.expressive()` wires expressive default animations into Material components (buttons have a "squish" on press, `FilterChip` has anticipated easing).
- New components: `LoadingIndicator` (replaces the old `CircularProgressIndicator` for indeterminate flows), expressive `FloatingActionButton` with morphing shape transitions.
- Review: if the project opts in to Expressive, ensure `MotionScheme` is wired on the root theme; individual components inherit automatically.


## Anti-patterns

- `Text("...", color = Color(0xFF333333))` — bypasses theme; breaks dark mode.
- `Divider(color = Color.Gray)` — use `HorizontalDivider()` (Material3 1.2+), let theme pick the color.
- `Modifier.height(40.dp)` for a button — let `Button` size itself or use `ButtonDefaults.MinHeight`.
- Using Material 2 imports inside a Material3 theme — fonts and colors will silently not theme correctly.
- Hard-coded dp values for text sizing (use `sp` for text) or text in px.


## Review checklist

- Only `androidx.compose.material3.*` imports in app code (no Material 2 mix-ins).
- Every screen wrapped in (or descended from) `AppTheme`.
- Colours pulled from `MaterialTheme.colorScheme.*` — no `Color(0xFF...)` in UI code outside theme files.
- Typography via `MaterialTheme.typography.*`; no direct `fontSize = Nsp`.
- Touch targets 48dp+; custom clickables use `minimumInteractiveComponentSize()` or wrap in `IconButton`.
- Shapes via `MaterialTheme.shapes.*` or documented brand shape tokens.
- Window size classes used for layout variants instead of boolean flags.
- Edge-to-edge insets handled via `Scaffold` or explicit `windowInsetsPadding`.
- Material 3 Expressive `MotionScheme` applied when the project has adopted it.
