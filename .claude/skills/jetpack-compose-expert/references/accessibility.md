# Accessibility Reference

## Table of Contents

- [Principles](#principles)
- [contentDescription vs Semantic Text](#contentdescription-vs-semantic-text)
- [Modifier.semantics](#modifiersemantics)
- [mergeDescendants](#mergedescendants)
- [clearAndSetSemantics](#clearandsetsemantics)
- [Role](#role)
- [minimumInteractiveComponentSize](#minimuminteractivecomponentsize)
- [Live Regions](#live-regions)
- [Pane Titles and Headings](#pane-titles-and-headings)
- [Custom Actions](#custom-actions)
- [Testing with the Semantics Tree](#testing-with-the-semantics-tree)

## Principles

TalkBack, Switch Access, and Voice Access all read from the Compose **semantics tree**, a parallel structure built alongside the UI tree. Every composable contributes nodes; the semantics tree is what assistive tech sees.

The goal of accessibility work in Compose is:

1. Every interactive element has an accessible label (`contentDescription` or text content).
2. Groups read as one concept when the visual intent is one concept (`mergeDescendants`).
3. Roles are correct (`Role.Button`, `Role.Checkbox`, `Role.Switch`).
4. Touch targets are ≥ 48dp.
5. Focus order matches reading order.
6. State changes announce when the user needs them to (live regions).

## contentDescription vs Semantic Text

| Element | Accessibility source |
|---|---|
| `Text("Save")` | Its own content — no `contentDescription` needed |
| `Icon(Icons.Default.Save, contentDescription = "Save")` | Explicit `contentDescription` |
| Decorative-only icon | `Icon(..., contentDescription = null)` — omit from semantics |
| `Image` that conveys information | `contentDescription = "Farm aerial photo"` |

The general rule: if a sighted user would understand the purpose from visuals, a non-sighted user must get the same from `contentDescription`.

```kotlin
// Correct — labeled
IconButton(onClick = onDelete) {
    Icon(Icons.Default.Delete, contentDescription = "Delete field")
}

// Correct — decorative icon next to descriptive text
Row {
    Icon(Icons.Default.Info, contentDescription = null)
    Text("3 fields overdue")
}

// BUG — unlabeled button
IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = null) }
```

## Modifier.semantics

Adds or overrides semantic properties on any composable.

```kotlin
Box(
    Modifier
        .clickable { onToggle() }
        .semantics {
            contentDescription = "Toggle alert"
            role = Role.Switch
            stateDescription = if (enabled) "On" else "Off"
        }
) { /* ... */ }
```

Available properties (selection):

| Property | Purpose |
|---|---|
| `contentDescription` | Label |
| `stateDescription` | "On", "3 of 5", "Unread" |
| `role` | `Button`, `Checkbox`, `Switch`, `Tab`, `RadioButton`, `Image`, `DropdownList` |
| `disabled()` | Marks the node as non-interactive |
| `selected` | For tabs, radio buttons |
| `progressBarRangeInfo` | Numeric progress info |
| `liveRegion` | `LiveRegionMode.Polite` / `Assertive` |
| `paneTitle` | For pane-level landmarks |
| `heading()` | Marks as section heading |
| `error(message)` | Announces a validation error |

## mergeDescendants

Compose treats each semantic node as focus-stop by default. A card with an icon + title + subtitle is three stops unless merged:

```kotlin
Row(
    Modifier
        .clickable { onOpen() }
        .semantics(mergeDescendants = true) { /* one focus stop now */ }
) {
    Icon(Icons.Default.Folder, contentDescription = null)
    Column {
        Text(farm.name)
        Text("${farm.acres} acres", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
```

Most Material 3 interactive components (`Button`, `IconButton`, `Card` with `onClick`, list items with `selectable`, `toggleable`, `clickable`) merge automatically. You mostly write `mergeDescendants = true` explicitly on custom row layouts with ad-hoc `clickable` modifiers.

## clearAndSetSemantics

Replaces the subtree's entire semantics with exactly what you define. Use for elements whose visual breakdown is misleading:

```kotlin
// A complex temperature badge: "75°" + trend arrow icon + "5° up"
Row(
    Modifier.clearAndSetSemantics {
        contentDescription = "Temperature 75 degrees, 5 up from yesterday"
    },
) {
    Text("75°")
    Icon(Icons.Default.ArrowUpward, contentDescription = null)
    Text("5°")
}
```

Never use `clearAndSetSemantics` casually — it hides every property (including interactive state) unless you re-declare it.

## Role

Tells TalkBack the widget type so it says "Button, Save" rather than just "Save".

```kotlin
Box(
    Modifier
        .clickable { /* ... */ }
        .semantics { role = Role.Button }
)
```

Material 3 components set `role` correctly by default. Manual `.clickable { }` on a custom composable should declare `role`.

## minimumInteractiveComponentSize

All touch targets should be at least 48dp × 48dp. Material 3 clickable components enforce this via `LocalMinimumInteractiveComponentSize`.

```kotlin
// If you build a custom small interactive element
IconButton(
    onClick = onDismiss,
    modifier = Modifier.minimumInteractiveComponentSize(),
) { Icon(Icons.Default.Close, contentDescription = "Dismiss") }
```

If you genuinely need to opt out (an icon row of nine toggles in a compact chip):

```kotlin
CompositionLocalProvider(LocalMinimumInteractiveComponentSize provides Dp.Unspecified) {
    TinyIconButton(/* ... */)
}
```

Document why, and ensure the visual target still meets the 48dp "invisible hit area" rule or provide an alternative surface for users who need it.

## Live Regions

Announces a UI change without requiring focus. Use sparingly — assertive interrupts, polite queues.

```kotlin
Text(
    text = errorMessage,
    color = MaterialTheme.colorScheme.error,
    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
)
```

Use cases:

- A form validation summary that updates as the user types.
- A timer or countdown that should be read aloud at key transitions.
- A status strip that updates async ("Sync failed — retrying").

`Snackbar` already handles announcements; do not add `liveRegion` to one.

## Pane Titles and Headings

`paneTitle` names a landmark (a pane within a `NavigationSuiteScaffold` / two-pane layout). `heading()` marks a text node as a section heading so TalkBack users can jump between them.

```kotlin
Column(Modifier.semantics { paneTitle = "Field details" }) {
    Text("Actions", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge)
    Text("History", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge)
}
```

Headings are a navigation win on long screens. Use them for every section header.

## Custom Actions

Add actions invokable via TalkBack's local context menu (useful for complex list items with swipe actions):

```kotlin
Row(
    Modifier.semantics {
        customActions = listOf(
            CustomAccessibilityAction("Archive") { archive(field.id); true },
            CustomAccessibilityAction("Mark done") { markDone(field.id); true },
        )
    }
) { /* ... */ }
```

This replaces the need for a hidden "more options" menu for assistive-tech users.

## Testing with the Semantics Tree

```kotlin
@Test
fun saveButton_hasLabel() {
    composeRule.setContent { SaveButton(onSave = {}) }
    composeRule.onNodeWithContentDescription("Save").assertExists().assertHasClickAction()
}

@Test
fun farmRow_mergesIntoSingleFocusStop() {
    composeRule.setContent { FarmRow(farm = testFarm, onOpen = {}) }
    composeRule.onNode(hasText(testFarm.name) and hasText("${testFarm.acres} acres"))
        .assertIsDisplayed()
}
```

Dump the semantics tree while debugging:

```kotlin
composeRule.onRoot().printToLog("SEMANTICS")
```

Also verify with the device: run TalkBack via Accessibility Shortcut (volume-up + volume-down for 3s) and sweep through the screen. If you hit an unlabeled stop, fix it before shipping.
