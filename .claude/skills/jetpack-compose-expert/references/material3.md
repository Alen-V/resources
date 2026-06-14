# Material 3 Expressive Reference

## Table of Contents

- [Imports and BOM](#imports-and-bom)
- [Theming — ColorScheme, Typography, Shapes](#theming--colorscheme-typography-shapes)
- [Dynamic Color](#dynamic-color)
- [Scaffold](#scaffold)
- [TopAppBar Variants](#topappbar-variants)
- [Navigation — NavigationBar, NavigationRail, NavigationSuiteScaffold](#navigation--navigationbar-navigationrail-navigationsuitescaffold)
- [WindowSizeClass](#windowsizeclass)
- [Buttons, Chips, Sliders](#buttons-chips-sliders)
- [ModalBottomSheet](#modalbottomsheet)
- [Motion Schemes](#motion-schemes)

## Imports and BOM

```kotlin
// build.gradle.kts (app)
implementation(platform("androidx.compose:compose-bom:2026.02.00"))
implementation("androidx.compose.material3:material3")
implementation("androidx.compose.material3:material3-window-size-class")
implementation("androidx.compose.material3:material3-adaptive-navigation-suite")
implementation("androidx.compose.material:material-icons-extended")  // icons are shared with M2
```

All widget imports are `androidx.compose.material3.*`. Never mix `androidx.compose.material.*` (Material 2) into a Material 3 screen — ripple, typography, and theme lookups will silently disagree.

## Theming — ColorScheme, Typography, Shapes

```kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colors = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(LocalContext.current)
            else dynamicLightColorScheme(LocalContext.current)
        darkTheme -> darkColorScheme(
            primary = Color(0xFF86D293),
            secondary = Color(0xFFB6CCB7),
            tertiary = Color(0xFF9FCAE7),
        )
        else -> lightColorScheme(
            primary = Color(0xFF1C6B3C),
            secondary = Color(0xFF50634F),
            tertiary = Color(0xFF37627D),
        )
    }
    MaterialTheme(
        colorScheme = colors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content,
    )
}
```

Read tokens from `MaterialTheme` — not hardcoded literals:

```kotlin
Text("Title", style = MaterialTheme.typography.headlineMedium)
Box(Modifier.background(MaterialTheme.colorScheme.surfaceContainerHigh))
Card(shape = MaterialTheme.shapes.large)
```

Material 3 Expressive ships additional shape tokens (`extraLarge`, `extraSmall`) and extended typography (`displayLarge` → `labelSmall`). Custom `Shapes` now exposes 7 size buckets.

## Dynamic Color

Dynamic color derives the palette from the user's wallpaper on Android 12+. Always wrap the call site in a version check:

```kotlin
val useDynamic = dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
```

Gotcha: dynamic color can produce low-contrast pairings with brand accents. For apps with brand identity, either disable dynamic color (`dynamicColor = false`) or let the user opt in via Settings.

## Scaffold

```kotlin
@Composable
fun FarmsScreen() {
    val snackbarHostState = remember { SnackbarHostState() }
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Farms") },
                scrollBehavior = scrollBehavior,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = { FloatingActionButton(onClick = {}) { Icon(Icons.Default.Add, null) } },
    ) { innerPadding ->
        LazyColumn(
            contentPadding = innerPadding,
            modifier = Modifier.fillMaxSize(),
        ) { /* ... */ }
    }
}
```

Rules:

- Always apply `innerPadding` to the body's root layout.
- For `LazyColumn`, prefer `contentPadding = innerPadding` so the list renders under the app bar area and scrolls into it.
- Pair `enterAlwaysScrollBehavior` with `Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)` at the Scaffold level.

## TopAppBar Variants

| Variant | When |
|---|---|
| `TopAppBar` | Default, fixed 64dp |
| `CenterAlignedTopAppBar` | Titles visually centered (single-pane detail screens) |
| `MediumTopAppBar` | 112dp with large title, collapses on scroll |
| `LargeTopAppBar` | 152dp with very large title, collapses on scroll |
| `FlexibleTopAppBar` (Expressive) | Continuously resizes with scroll |

Scroll behaviors:

| Behavior | Effect |
|---|---|
| `pinnedScrollBehavior()` | Never collapses |
| `enterAlwaysScrollBehavior()` | Collapses on scroll down, expands on any scroll up |
| `exitUntilCollapsedScrollBehavior()` | Collapses on scroll down, stays collapsed until list returns to top |

## Navigation — NavigationBar, NavigationRail, NavigationSuiteScaffold

Use `NavigationSuiteScaffold` to adapt between `NavigationBar` (compact), `NavigationRail` (medium), and `PermanentNavigationDrawer` (expanded) based on window size class:

```kotlin
@Composable
fun AppShell(destinations: List<Dest>, selected: Dest, onSelect: (Dest) -> Unit, content: @Composable () -> Unit) {
    NavigationSuiteScaffold(
        navigationSuiteItems = {
            destinations.forEach { dest ->
                item(
                    selected = dest == selected,
                    onClick = { onSelect(dest) },
                    icon = { Icon(dest.icon, null) },
                    label = { Text(dest.label) },
                )
            }
        },
        content = content,
    )
}
```

Manual `NavigationBar` is appropriate only when the app is phone-only or the design rejects rail/drawer expansion.

## WindowSizeClass

```kotlin
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass

@Composable
fun App() {
    val activity = LocalActivity.current ?: return
    val sizeClass = calculateWindowSizeClass(activity)
    when (sizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> PhoneLayout()
        WindowWidthSizeClass.Medium -> TabletPortraitLayout()
        WindowWidthSizeClass.Expanded -> DesktopLayout()
    }
}
```

Prefer `NavigationSuiteScaffold` + adaptive components over hand-branching where possible. Use `WindowSizeClass` for non-navigation decisions (list vs two-pane, image scaling).

## Buttons, Chips, Sliders

```kotlin
// Filled (primary)
Button(onClick = { /* ... */ }) { Text("Save") }

// Tonal — secondary action
FilledTonalButton(onClick = { /* ... */ }) { Text("Cancel") }

// Outlined — secondary action, low emphasis
OutlinedButton(onClick = { /* ... */ }) { Text("Later") }

// Text — inline actions
TextButton(onClick = { /* ... */ }) { Text("Learn more") }

// Elevated — rare, for surfaces where tonal doesn't provide enough separation
ElevatedButton(onClick = { /* ... */ }) { Text("Upload") }
```

Chips:

```kotlin
AssistChip(onClick = {}, label = { Text("Add to calendar") }, leadingIcon = { Icon(Icons.Default.Event, null) })
FilterChip(selected = isOn, onClick = { isOn = !isOn }, label = { Text("Mine") })
InputChip(selected = false, onClick = {}, label = { Text("alen@example.com") }, trailingIcon = { Icon(Icons.Default.Close, null) })
SuggestionChip(onClick = {}, label = { Text("Suggestion") })
```

Material 3 Expressive introduces `ToggleButton`, `SplitButton`, and `ButtonGroup` — pick these over stacking `Button`s manually.

## ModalBottomSheet

```kotlin
val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
val scope = rememberCoroutineScope()
var show by remember { mutableStateOf(false) }

if (show) {
    ModalBottomSheet(
        onDismissRequest = { show = false },
        sheetState = sheetState,
    ) {
        Column(Modifier.padding(16.dp)) { /* ... */ }
    }
}
```

Predictive back is wired automatically. Dismiss imperatively with `scope.launch { sheetState.hide() }.invokeOnCompletion { show = false }`.

## Motion Schemes

Expressive introduces standardized motion tokens via `MotionScheme`:

```kotlin
MaterialTheme(
    motionScheme = MotionScheme.expressive(),   // or MotionScheme.standard()
) { /* ... */ }

@Composable
fun MyCard() {
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = MaterialTheme.motionScheme.fastSpatialSpec(),
        label = "scale",
    )
}
```

Specs are named by intent: `defaultSpatialSpec` / `fastSpatialSpec` / `slowSpatialSpec` for layout motion; `defaultEffectsSpec` / `fastEffectsSpec` / `slowEffectsSpec` for color/alpha. Pull from the scheme rather than hardcoding `tween(300)`.
