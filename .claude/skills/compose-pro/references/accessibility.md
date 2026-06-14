# Accessibility — TalkBack, semantics, dynamic text, reduced motion

Compose has a rich semantics API. Most accessibility issues are things that are missing, not things that are wrong. Review every interactive or informational composable against the checklist at the bottom.


## TalkBack and the semantics tree

TalkBack reads the Compose semantics tree. Every `Text`, `Icon`, clickable, and stateful control contributes semantics. Review for:

- Icon-only buttons without a meaningful `contentDescription`.
- Clickable `Row`s whose children have separate semantics (TalkBack reads them one at a time instead of as a single element).
- Custom controls (sliders, toggles) that do not report a `Role`.


## contentDescription

`contentDescription` is the string TalkBack reads for an `Image` or `Icon`. Rules:

- Decorative icons inside a composable that already has a label → `contentDescription = null`.
- Icons that are the sole visual element of an action → describe the action (e.g. "Delete").
- Avoid redundant words like "button", "image", "icon" — TalkBack adds the role automatically.

```kotlin
// Before — TalkBack reads nothing, user can't act on the button
IconButton(onClick = onDelete) {
    Icon(Icons.Default.Delete, contentDescription = null)
}

// After
IconButton(onClick = onDelete) {
    Icon(Icons.Default.Delete, contentDescription = "Delete")
}

// Decorative — icon sits beside a "Delete" label
Row(Modifier.clickable(onClick = onDelete)) {
    Icon(Icons.Default.Delete, contentDescription = null)
    Text("Delete")
}
```


## Merging and clearing semantics

By default each composable produces its own semantics node. Merge them when they represent one logical element:

```kotlin
// Before — TalkBack reads "Alice", then "Online"
Row(Modifier.clickable { onOpen() }) {
    Text("Alice")
    Text("Online")
}

// After — TalkBack reads "Alice, Online, button"
Row(Modifier
    .clickable(onClick = onOpen)
    .semantics(mergeDescendants = true) {}
) {
    Text("Alice")
    Text("Online")
}
```

- `Modifier.clickable { }` already merges descendants for its own subtree, but complex layouts may need explicit `semantics(mergeDescendants = true)`.
- Use `Modifier.clearAndSetSemantics { contentDescription = "..." }` to override all descendant semantics with a single description — useful for chart-like custom composables.


## Role

Custom controls should declare a `Role`:

```kotlin
Box(
    modifier = Modifier
        .toggleable(value = checked, onValueChange = onCheckedChange, role = Role.Checkbox),
)
```

Built-in components (`Checkbox`, `Switch`, `RadioButton`, `Button`) already set their role. Flag custom `clickable` composables that behave like a checkbox or switch but report no role.


## stateDescription and liveRegion

- `stateDescription` is for state that supplements the main label: `semantics { stateDescription = if (expanded) "Expanded" else "Collapsed" }`.
- `liveRegion` announces changes for non-focused updates: `semantics { liveRegion = LiveRegionMode.Polite }` on a status `Text` that updates during a long task.


## Pane titles

For split-screen or multi-pane layouts, each pane should declare a pane title:

```kotlin
Column(Modifier.semantics { paneTitle = "Details" }) { ... }
```


## Dynamic text scaling

- Font sizes in `sp` scale with the user's preferred text size.
- Never use `dp` for text sizing.
- Layouts must not clip or overflow at 200% font scale. Check with `@PreviewFontScale`.

```kotlin
@PreviewFontScale
@Composable
private fun SettingsRowPreview() {
    AppTheme { SettingsRow(title = "Account", subtitle = "you@example.com") }
}
```

- Flag fixed-height rows (`Modifier.height(48.dp)`) containing multiline text that expands with font scale. Use `Modifier.heightIn(min = 48.dp)` instead.


## Reduced motion

`LocalAccessibilityManager` reports whether the user has reduced motion enabled:

```kotlin
val reduceMotion = LocalAccessibilityManager.current?.areTransitionsReduced == true
val spec: AnimationSpec<Float> = if (reduceMotion) snap() else spring()
val alpha by animateFloatAsState(
    targetValue = if (visible) 1f else 0f,
    animationSpec = spec,
)
```

- For long, decorative animations (marketing-style reveals), skip or shorten when `areTransitionsReduced` is true.
- For functional animations (progress, drag feedback), leave them — users still need the signal.


## Touch targets and gestures

- 48dp minimum (see `references/design.md`).
- Drag-only gestures must have an accessible alternative (e.g. buttons that nudge the value, or an accessibility action via `semantics { customActions = listOf(CustomAccessibilityAction("Increase", { ... })) }`).
- Long-press without visual affordance is discouraged — add a `CustomAccessibilityAction` label for TalkBack.


## Colour contrast

Material 3 dynamic color generally produces compliant contrast, but review when you override:

- Body text on `surface` must be at least 4.5:1 contrast.
- Large text (18sp+, or 14sp+ bold) must be at least 3:1.
- Non-text interactive elements must be at least 3:1 against adjacent colors.


## Anti-patterns

- `Image(..., contentDescription = "")` on a functional image — use either `null` (decorative) or a real description.
- `Text` inside a `Box(Modifier.clickable { })` where the outer Box has no accessible label and no semantics merge.
- Gesture-only controls (swipe dismiss) with no accessible action.
- `Modifier.size(24.dp).clickable { ... }` — under the 48dp tap target.
- Hard-coded `fontSize = 12.sp` for critical info — too small at default scale.
- Animations driven by `rememberInfiniteTransition` with no reduced-motion fallback.


## Review checklist

- Every `Icon`/`Image` has an explicit `contentDescription` (string or `null`, not missing).
- Icon-only `IconButton`s have a non-null `contentDescription`.
- Composite clickable rows merge descendants or clear semantics for TalkBack.
- Custom controls declare a `Role`.
- Status messages use `liveRegion` when they change during an ongoing task.
- All text uses `sp`; no `dp` font sizing.
- Layouts survive 200% font scale without clipping (`@PreviewFontScale` preview present).
- Animations honor `LocalAccessibilityManager.current?.areTransitionsReduced`.
- Tap targets 48dp+ (`minimumInteractiveComponentSize()` or `IconButton`).
- Gesture-only affordances have accessible alternatives.
- Dynamic color / overridden colors meet WCAG AA contrast.
