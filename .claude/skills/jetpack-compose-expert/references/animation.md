# Animation Reference

## Table of Contents

- [API Selection](#api-selection)
- [animate*AsState](#animateasstate)
- [AnimatedVisibility](#animatedvisibility)
- [AnimatedContent](#animatedcontent)
- [Crossfade](#crossfade)
- [updateTransition](#updatetransition)
- [Animatable — Gesture-Driven Escape Hatch](#animatable--gesture-driven-escape-hatch)
- [rememberInfiniteTransition](#rememberinfinitetransition)
- [SharedTransitionLayout and sharedElement](#sharedtransitionlayout-and-sharedelement)
- [Animation Specs — spring, tween, keyframes](#animation-specs--spring-tween-keyframes)

## API Selection

| Animating | API |
|---|---|
| A single value (float, color, dp, offset) on state change | `animate*AsState` |
| Show / hide a composable with enter+exit transitions | `AnimatedVisibility` |
| Swap one composable for another with transitions | `AnimatedContent` |
| Simple two-state fade | `Crossfade` |
| Multiple properties driven by one state machine | `updateTransition` |
| Gesture-driven value with explicit control over start/stop | `Animatable` |
| Endless loops | `rememberInfiniteTransition` |
| Element that moves across screen boundaries | `SharedTransitionLayout` + `sharedElement` |

## animate*AsState

```kotlin
val scale by animateFloatAsState(
    targetValue = if (pressed) 0.95f else 1f,
    animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
    label = "card-press",
)

Box(Modifier.graphicsLayer { scaleX = scale; scaleY = scale })
```

Variants: `animateFloatAsState`, `animateDpAsState`, `animateColorAsState`, `animateIntAsState`, `animateOffsetAsState`, `animateIntOffsetAsState`, `animateSizeAsState`, `animateIntSizeAsState`, `animateRectAsState`, `animateValueAsState` (generic with `TwoWayConverter`).

`label` is mandatory (lint error without) — it shows up in the Animation Preview tool.

Read the animated value inside a lambda modifier (`graphicsLayer { }`, `drawBehind { }`, `offset { }`) to avoid recomposition; see `performance-patterns.md`.

## AnimatedVisibility

```kotlin
AnimatedVisibility(
    visible = showHint,
    enter = fadeIn() + slideInVertically(initialOffsetY = { -it }),
    exit = fadeOut() + slideOutVertically(targetOffsetY = { -it }),
) {
    HintBanner(text = "Tap to select")
}
```

Enter / exit builders (combine with `+`):

- `fadeIn()`, `fadeOut()`
- `slideInVertically`, `slideOutVertically`, `slideInHorizontally`, `slideOutHorizontally`
- `expandIn`, `expandVertically`, `expandHorizontally`, `shrinkOut`, `shrinkVertically`, `shrinkHorizontally`
- `scaleIn`, `scaleOut`

Inside `AnimatedVisibility`, the content has access to `this.transition: Transition<EnterExitState>` for per-child animation staggering.

## AnimatedContent

```kotlin
AnimatedContent(
    targetState = selectedTab,
    transitionSpec = {
        slideInHorizontally { it } + fadeIn() togetherWith
            slideOutHorizontally { -it } + fadeOut()
    },
    label = "tab-content",
) { tab ->
    when (tab) {
        Tab.Farms -> FarmsPane()
        Tab.Tasks -> TasksPane()
    }
}
```

Key behaviors:

- The lambda receives `targetState` and the content it renders is associated with that state.
- Per-state direction in `transitionSpec`:

```kotlin
transitionSpec = {
    if (targetState.ordinal > initialState.ordinal) {
        slideInHorizontally { it } togetherWith slideOutHorizontally { -it }
    } else {
        slideInHorizontally { -it } togetherWith slideOutHorizontally { it }
    }
}
```

- `contentKey = { it.id }` — treat different targets with the same id as equivalent (no animation).

## Crossfade

Simple case of `AnimatedContent` with fade-only transition.

```kotlin
Crossfade(targetState = screen, label = "screen") { current ->
    when (current) {
        Screen.Home -> HomeScreen()
        Screen.Settings -> SettingsScreen()
    }
}
```

Use `Crossfade` only for trivial fades; `AnimatedContent` is the more general tool.

## updateTransition

Groups related property animations under one logical transition so they start together:

```kotlin
val transition = updateTransition(expanded, label = "card")
val height by transition.animateDp(label = "h") { if (it) 200.dp else 80.dp }
val alpha by transition.animateFloat(label = "a") { if (it) 1f else 0.5f }
val color by transition.animateColor(label = "c") {
    if (it) MaterialTheme.colorScheme.primaryContainer
    else MaterialTheme.colorScheme.surfaceContainer
}
```

Prefer `updateTransition` over multiple `animate*AsState` when properties must animate in lockstep.

## Animatable — Gesture-Driven Escape Hatch

`Animatable` gives imperative control; use when `animate*AsState` is not expressive enough (gesture-driven, `snapTo`, `animateDecay`).

```kotlin
val offsetX = remember { Animatable(0f) }
val scope = rememberCoroutineScope()

Box(
    Modifier
        .offset { IntOffset(offsetX.value.roundToInt(), 0) }
        .pointerInput(Unit) {
            detectHorizontalDragGestures(
                onHorizontalDrag = { _, delta ->
                    scope.launch { offsetX.snapTo(offsetX.value + delta) }
                },
                onDragEnd = {
                    scope.launch {
                        offsetX.animateTo(0f, spring(stiffness = Spring.StiffnessLow))
                    }
                },
            )
        },
)
```

`Animatable.animateTo` is `suspend` — it cooperates with the coroutine and can be interrupted cleanly by a new `animateTo` or `snapTo`.

## rememberInfiniteTransition

For looping animations (shimmer, progress indicators).

```kotlin
val transition = rememberInfiniteTransition(label = "shimmer")
val alpha by transition.animateFloat(
    initialValue = 0.3f,
    targetValue = 1f,
    animationSpec = infiniteRepeatable(
        animation = tween(1_000, easing = FastOutSlowInEasing),
        repeatMode = RepeatMode.Reverse,
    ),
    label = "alpha",
)
Box(Modifier.graphicsLayer { this.alpha = alpha }.background(MaterialTheme.colorScheme.surfaceContainer))
```

`rememberInfiniteTransition` pauses with the composition lifetime — no manual teardown needed.

## SharedTransitionLayout and sharedElement

Transition shared elements across navigation boundaries (list -> detail).

```kotlin
@Composable
fun FeedNav() {
    SharedTransitionLayout {
        AnimatedContent(
            targetState = selectedId,
            label = "feed",
        ) { id ->
            if (id == null) {
                FeedList(
                    onSelect = { selectedId = it },
                    sharedScope = this@SharedTransitionLayout,
                    animatedScope = this@AnimatedContent,
                )
            } else {
                FeedDetail(
                    id = id,
                    sharedScope = this@SharedTransitionLayout,
                    animatedScope = this@AnimatedContent,
                )
            }
        }
    }
}

@Composable
fun FeedCard(
    id: String,
    sharedScope: SharedTransitionScope,
    animatedScope: AnimatedContentScope,
) = with(sharedScope) {
    Card(
        modifier = Modifier.sharedElement(
            rememberSharedContentState(key = "feed-$id"),
            animatedVisibilityScope = animatedScope,
        ),
    ) { /* ... */ }
}
```

The `key` must match on both sides and be unique within the transition. Stable in Compose Foundation 1.7+; assume available in 2026.02.

## Animation Specs — spring, tween, keyframes

| Spec | When |
|---|---|
| `spring(dampingRatio, stiffness)` | Default for gesture-reactive / physical motion |
| `tween(durationMillis, delay, easing)` | Fixed-duration, specific curve |
| `keyframes { at(100) to value }` | Complex multi-stage timing |
| `snap(delayMillis)` | No animation, just snap after delay |
| `repeatable` / `infiniteRepeatable` | Loop wrappers |

```kotlin
// Spring — preferred for most UI
spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)

// Tween — when you need a specific curve
tween(300, easing = FastOutSlowInEasing)

// Keyframes
keyframes {
    durationMillis = 500
    0f at 0
    100f at 250 using FastOutSlowInEasing
    80f at 400
    100f at 500
}
```

Pull from `MaterialTheme.motionScheme` tokens in Material 3 Expressive apps rather than hardcoding values — see `material3.md`.
