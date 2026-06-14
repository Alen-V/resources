# Edge-to-Edge and Window Insets Reference

## Table of Contents

- [Why Edge-to-Edge](#why-edge-to-edge)
- [Activity Setup — enableEdgeToEdge](#activity-setup--enableedgetoedge)
- [WindowInsets Sources](#windowinsets-sources)
- [Applying Insets — Modifier.windowInsetsPadding](#applying-insets--modifierwindowinsetspadding)
- [Scaffold and Inset Handling](#scaffold-and-inset-handling)
- [Keyboard / IME Handling](#keyboard--ime-handling)
- [Status and Nav Bar Appearance](#status-and-nav-bar-appearance)
- [Gotchas](#gotchas)

## Why Edge-to-Edge

Apps targeting API 35 (Android 15) are **forced** to draw edge-to-edge. The system bars draw on top of content whether the app asks or not. If the UI does not handle insets, the top app bar slides under the status bar, the FAB hides under the nav bar, and TextFields vanish behind the keyboard.

`enableEdgeToEdge()` is the supported modern API. On API 35+ it is effectively a formality — the system draws this way regardless — but it remains required for correct behavior on API 29-34.

## Activity Setup — enableEdgeToEdge

```kotlin
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent { AppTheme { App() } }
    }
}
```

Call `enableEdgeToEdge()` **before** `super.onCreate` (or at least before `setContent`) to avoid a frame where the app renders inset-fitted.

Customize the system bar style (rare — defaults auto-adapt to theme):

```kotlin
enableEdgeToEdge(
    statusBarStyle = SystemBarStyle.auto(
        lightScrim = android.graphics.Color.TRANSPARENT,
        darkScrim = android.graphics.Color.TRANSPARENT,
    ),
    navigationBarStyle = SystemBarStyle.auto(
        lightScrim = lightScrimColor,
        darkScrim = darkScrimColor,
    ),
)
```

## WindowInsets Sources

Pull insets via the `WindowInsets` companion:

| Source | Covers |
|---|---|
| `WindowInsets.statusBars` | Top status bar |
| `WindowInsets.navigationBars` | Bottom gesture / three-button nav |
| `WindowInsets.systemBars` | Union of status + navigation |
| `WindowInsets.displayCutout` | Notch / punch-hole |
| `WindowInsets.safeDrawing` | systemBars + displayCutout + ime — "avoid covering content with anything" |
| `WindowInsets.safeContent` | safeDrawing + safeGestures — also avoids gesture-sensitive regions |
| `WindowInsets.ime` | Soft keyboard when shown |
| `WindowInsets.captionBar` | Desktop window title bar (ChromeOS / large-screen) |

`safeDrawing` is the usual default for full-screen layouts. `systemBars` is enough if the IME is handled separately (`imePadding()` on a form input).

## Applying Insets — Modifier.windowInsetsPadding

```kotlin
Box(
    Modifier
        .fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
) { content() }

// Shorthand helpers:
Modifier.safeDrawingPadding()      // windowInsetsPadding(WindowInsets.safeDrawing)
Modifier.safeContentPadding()
Modifier.systemBarsPadding()
Modifier.statusBarsPadding()
Modifier.navigationBarsPadding()
Modifier.imePadding()
Modifier.displayCutoutPadding()
```

For partial application (only the top of a full-bleed hero image, for example):

```kotlin
Box(
    Modifier
        .fillMaxSize()
        .windowInsetsPadding(WindowInsets.statusBars.only(WindowInsetsSides.Top))
) { content() }
```

To render edge-to-edge but consume the insets for children:

```kotlin
Box(
    Modifier
        .fillMaxSize()
        .consumeWindowInsets(WindowInsets.safeDrawing)   // children see zero inset
) { content() }
```

`consumeWindowInsets` is useful when you draw a full-bleed background and the children should already be padded.

## Scaffold and Inset Handling

`Scaffold` applies `contentWindowInsets` to its body padding by default. It also places the `topBar`, `bottomBar`, `snackbarHost`, and `floatingActionButton` outside that inset — they receive the original `WindowInsets`.

```kotlin
Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing,  // default
    topBar = { TopAppBar(title = { Text("Title") }) },
    bottomBar = { BottomAppBar { /* ... */ } },
) { innerPadding ->
    Column(Modifier.padding(innerPadding).fillMaxSize()) { content() }
}
```

For a full-bleed screen that manages its own insets, opt out:

```kotlin
Scaffold(contentWindowInsets = WindowInsets(0)) { innerPadding ->
    FullBleedMap(insets = WindowInsets.safeDrawing.asPaddingValues())
}
```

`LazyColumn` prefers `contentPadding` over `Modifier.padding` so the first and last items can scroll into/out of the inset area:

```kotlin
LazyColumn(contentPadding = innerPadding) { /* items */ }
```

## Keyboard / IME Handling

Three tools, different jobs:

| Need | Tool |
|---|---|
| Push the whole screen up when the keyboard opens | `Modifier.imePadding()` on the screen root |
| Scroll the content to keep focused element visible | `Modifier.imeNestedScroll()` on a scrollable |
| Animate content alongside the keyboard (predictive IME) | Read `WindowInsets.ime.getBottom(density)` inside `graphicsLayer { }` |

```kotlin
Column(
    Modifier
        .fillMaxSize()
        .safeDrawingPadding()       // handles status+nav+IME
        .imeNestedScroll(),         // scrolls into view with the keyboard
) { /* form */ }
```

Set `android:windowSoftInputMode="adjustResize"` in the manifest (default for new projects) so IME insets are delivered.

## Status and Nav Bar Appearance

Icon color (light vs dark foreground) is controlled by `SystemBarStyle`:

```kotlin
enableEdgeToEdge(
    statusBarStyle = if (isDarkTheme) SystemBarStyle.dark(scrim = Color.TRANSPARENT.toArgb())
                     else SystemBarStyle.light(scrim = Color.TRANSPARENT.toArgb(), darkScrim = Color.TRANSPARENT.toArgb()),
)
```

On API 35+ the system enforces a minimum scrim when app content doesn't provide enough contrast. Do not try to work around this — users need the bars to stay readable.

## Gotchas

**Gotcha: `Modifier.padding(WindowInsets.statusBars.asPaddingValues())` — works but consumes the inset only visually. Descendants still see the full inset.**

Use `Modifier.windowInsetsPadding(...)` instead, which both pads the current node and consumes the inset for descendants, so they don't double-pad.

**Gotcha: `BottomSheetScaffold` content getting cut off by the nav bar.**

The sheet itself is already inset-aware, but content inside it needs `Modifier.navigationBarsPadding()` if the sheet fills the screen.

**Gotcha: `ModalBottomSheet` showing under the nav bar on gesture-nav devices.**

Not a bug — that's by design for gesture nav. If your design requires the nav bar scrim, pass `windowInsets = WindowInsets(0)` and apply your own padding inside, or use `BottomSheetDefaults.windowInsets`.

**Gotcha: `Dialog` content full-bleed?**

`DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)` — the second flag gives you edge-to-edge inside the dialog.

**Gotcha: TopAppBar looking too tall on a device with a large cutout.**

Material 3 `TopAppBar` already consumes `statusBars`; double-applying via `Modifier.statusBarsPadding()` makes it too tall.
