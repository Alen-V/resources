# Predictive Back Navigation Reference

## Table of Contents

- [Why Predictive Back Matters](#why-predictive-back-matters)
- [Manifest Setup](#manifest-setup)
- [BackHandler — Simple Cases](#backhandler--simple-cases)
- [PredictiveBackHandler — Progress-Aware](#predictivebackhandler--progress-aware)
- [NavController Integration](#navcontroller-integration)
- [ModalBottomSheet and Dialogs](#modalbottomsheet-and-dialogs)
- [Custom Gesture Coordination](#custom-gesture-coordination)
- [Testing](#testing)

## Why Predictive Back Matters

On Android 14 (API 34), predictive back is opt-in; on Android 15 (API 35) it is default-on for apps targeting API 35+. Users see the previous screen revealed through a swipe gesture. If the app handles back incorrectly, the preview breaks and the gesture snaps.

**Must-haves on Android 14+:**

- Manifest declares `android:enableOnBackInvokedCallback="true"`.
- Every custom back interception uses `BackHandler` or `PredictiveBackHandler` (the `OnBackInvokedDispatcher`-integrated APIs), not `OnBackPressedDispatcher` alone.
- Back-consuming UI surfaces (sheets, dialogs, expanded search) animate dismissal in response to `progress`.

## Manifest Setup

```xml
<application
    android:enableOnBackInvokedCallback="true"
    ...>
```

This is the default in Compose Activity templates from BOM 2025.06+. Older projects must add it explicitly — without it, `PredictiveBackHandler.progress` never fires and the system falls back to the legacy dispatcher.

## BackHandler — Simple Cases

For a binary "handle this back" — no animation dependency — `BackHandler` is sufficient.

```kotlin
@Composable
fun SearchBar(expanded: Boolean, onCollapse: () -> Unit) {
    BackHandler(enabled = expanded) {
        onCollapse()
    }
    // ...
}
```

`enabled` is read reactively — toggling it enables / disables the handler without re-entering composition effects. Only enable when the handler is actually ready to consume back.

Stacking: the innermost enabled `BackHandler` wins.

## PredictiveBackHandler — Progress-Aware

Use when the UI can animate dismissal proportional to swipe progress.

```kotlin
@Composable
fun ExpandedSearchSheet(
    expanded: Boolean,
    onCollapse: () -> Unit,
    content: @Composable () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var progress by remember { mutableFloatStateOf(0f) }

    PredictiveBackHandler(enabled = expanded) { backEvents ->
        try {
            backEvents.collect { e ->
                progress = e.progress   // 0f -> 1f during swipe
            }
            // gesture completed
            onCollapse()
        } catch (e: CancellationException) {
            // gesture cancelled
            scope.launch {
                animate(progress, 0f) { v, _ -> progress = v }
            }
        }
    }

    Box(
        Modifier.graphicsLayer {
            scaleX = 1f - progress * 0.1f
            scaleY = 1f - progress * 0.1f
            alpha = 1f - progress * 0.5f
        },
    ) { content() }
}
```

The handler receives a `Flow<BackEventCompat>`:

- Emissions stream the in-progress gesture (swipe edge, touch x/y, progress `0f..1f`, `swipeEdge`).
- Normal collection completion = user committed the back.
- Cancellation (`CancellationException`) = user released without committing.

## NavController Integration

Navigation-Compose handles predictive back automatically for `NavHost` transitions starting in 2.8+. You do not need a manual `BackHandler` to pop the back stack.

```kotlin
val nav = rememberNavController()
NavHost(nav, startDestination = Home) {
    composable<Home> { HomeScreen(onField = { nav.navigate(FieldDetails(it)) }) }
    composable<FieldDetails> { FieldDetailsScreen(onBack = { nav.navigateUp() }) }
}
```

When a destination has custom back consumption (an expanded sheet, a multi-step form), add a `BackHandler` / `PredictiveBackHandler` inside that destination. It will intercept before the `NavController` hears the event.

## ModalBottomSheet and Dialogs

Material 3 `ModalBottomSheet` and `AlertDialog` integrate predictive back out of the box on API 34+. The back gesture dismisses them with the platform preview animation. Do not stack a `BackHandler` on top — it double-consumes.

```kotlin
if (showSheet) {
    ModalBottomSheet(onDismissRequest = { showSheet = false }) { /* ... */ }
    // No BackHandler needed — the sheet consumes back itself.
}
```

For a full-screen `Dialog` with `DialogProperties(usePlatformDefaultWidth = false)`, the predictive animation is not automatic — add a `PredictiveBackHandler` if you want a gesture-driven dismissal preview.

## Custom Gesture Coordination

If your composable has its own horizontal swipe gesture, predictive back can conflict. Resolve by:

- Reserving the system gesture zone (the outer 16-24dp at the screen edge) — don't consume touches there.
- Disabling the `PredictiveBackHandler` when your own drag is active:

```kotlin
PredictiveBackHandler(enabled = !isDraggingHorizontally) { /* ... */ }
```

- For full-screen pagers (`HorizontalPager` edge-to-edge), let the pager own the edge and don't add a `PredictiveBackHandler`; the `NavController` will take care of root-level back.

## Testing

Manual verification: enable "Animator duration scale 2x" in Developer Options to slow the preview. The destination being revealed must be the correct prior screen, and the foreground must animate proportional to progress.

Instrumented testing:

```kotlin
@Test
fun expandedSheet_collapsesOnBack() {
    composeRule.setContent {
        var expanded by mutableStateOf(true)
        if (expanded) {
            ExpandedSearchSheet(expanded = expanded, onCollapse = { expanded = false }) { /* ... */ }
        }
    }
    composeRule.activity.onBackPressedDispatcher.onBackPressed()
    composeRule.onNodeWithTag("expanded-sheet").assertDoesNotExist()
}
```

Predictive progress emission is difficult to drive in instrumented tests today. Use Espresso's `GeneralSwipeAction` from the left edge for gesture correctness; for progress math, unit-test the animation math separately.
