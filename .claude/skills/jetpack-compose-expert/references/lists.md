# Lazy Lists and Grids Reference

## Table of Contents

- [LazyColumn, LazyRow, LazyVerticalGrid](#lazycolumn-lazyrow-lazyverticalgrid)
- [Keys](#keys)
- [contentType for Heterogeneous Lists](#contenttype-for-heterogeneous-lists)
- [rememberLazyListState](#rememberlazyliststate)
- [animateItem](#animateitem)
- [Sticky Headers](#sticky-headers)
- [Nested Scrolling](#nested-scrolling)
- [LazyListScope Idioms](#lazylistscope-idioms)
- [Common Traps](#common-traps)

## LazyColumn, LazyRow, LazyVerticalGrid

```kotlin
LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp),
) {
    items(fields, key = { it.id }) { field ->
        FieldRow(field)
    }
}

LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
    items(tags, key = { it.id }) { tag -> TagChip(tag) }
}

LazyVerticalGrid(
    columns = GridCells.Adaptive(minSize = 160.dp),
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp),
) {
    items(photos, key = { it.id }) { photo -> PhotoTile(photo) }
}
```

Grid column strategies:

- `GridCells.Fixed(n)` — always `n` columns.
- `GridCells.Adaptive(minSize = 160.dp)` — as many columns as fit, each at least the given width.
- `GridCells.FixedSize(128.dp)` — each column is that width, as many as fit.

For non-uniform spans use `LazyVerticalStaggeredGrid`.

## Keys

Lazy lists identify items by **position** unless you pass `key`. Wrong identity produces: sudden jumps on re-order, animation glitches, and state-loss inside item composables.

```kotlin
// Default — position-based identity
items(fields) { field -> FieldRow(field) }

// Correct — stable identity per item
items(fields, key = { it.id }) { field -> FieldRow(field) }
```

Keys must be:

- **Stable** across recompositions (same value in same logical position).
- **Unique** within the list.
- **Parcelable, `Serializable`, or a primitive** if you want `rememberSaveable` state inside the item to survive configuration changes.

Never use the index as a key for a list that can reorder, filter, or insert at the top — it defeats the point.

## contentType for Heterogeneous Lists

Compose can reuse a disposed slot when the next item has the same `contentType`. Without it, a list of mixed rows re-inflates layout on every scroll.

```kotlin
sealed interface FeedEntry {
    data class Header(val id: String, val title: String) : FeedEntry
    data class Field(val id: String, val name: String) : FeedEntry
}

items(
    entries,
    key = { it.id },
    contentType = { it::class },
) { entry ->
    when (entry) {
        is FeedEntry.Header -> HeaderRow(entry)
        is FeedEntry.Field -> FieldRow(entry)
    }
}
```

When all items are the same shape, `contentType` is optional; when the list mixes rows that differ significantly, it's a measurable win.

## rememberLazyListState

```kotlin
val listState = rememberLazyListState(
    initialFirstVisibleItemIndex = 0,
    initialFirstVisibleItemScrollOffset = 0,
)

LazyColumn(state = listState) { /* ... */ }
```

Scroll programmatically:

```kotlin
val scope = rememberCoroutineScope()
Button(onClick = { scope.launch { listState.animateScrollToItem(0) } }) { Text("Top") }
```

Observe state changes without provoking recomposition of the whole tree:

```kotlin
val isAtTop by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset == 0
    }
}
```

## animateItem

```kotlin
items(fields, key = { it.id }) { field ->
    FieldRow(
        field = field,
        modifier = Modifier.animateItem(
            fadeInSpec = tween(200),
            placementSpec = spring(stiffness = Spring.StiffnessMediumLow),
            fadeOutSpec = tween(100),
        ),
    )
}
```

`animateItem` covers **appearance, disappearance, and placement** in one call. It replaces the older `animateItemPlacement()` (placement only) and is required for the other two animation channels.

Requires a stable `key`; without one, the runtime cannot match old positions to new.

## Sticky Headers

```kotlin
LazyColumn {
    byCategory.forEach { (category, items) ->
        stickyHeader(key = "header-${category.id}") {
            CategoryHeader(category)
        }
        items(items, key = { it.id }) { FieldRow(it) }
    }
}
```

Stick headers float over subsequent content. Keys must be unique across the whole list, not just within their group — prefix them (`"header-..."`, `"item-..."`).

## Nested Scrolling

A `LazyColumn` inside another scrolling container (`Column(Modifier.verticalScroll(...))`) will break. The outer scroller gives unbounded height constraints and the `LazyColumn` crashes or infinitely expands.

Fixes:

- Single outer scroller: make the whole thing a `LazyColumn` with `item { ... }` blocks for non-list content.

```kotlin
LazyColumn {
    item { HeroHeader() }
    item { FiltersRow() }
    items(fields, key = { it.id }) { FieldRow(it) }
    item { Footer() }
}
```

- Horizontal inside vertical: `LazyRow` inside `LazyColumn` `item { }` works and is the common case.

## LazyListScope Idioms

`LazyListScope` is where items are declared:

```kotlin
LazyColumn {
    item { Header() }                                // single item
    item(contentType = "divider") { HorizontalDivider() }
    items(count = 10) { index -> Placeholder(index) }
    items(items = list, key = { it.id }) { item -> Row(item) }
    itemsIndexed(items = list, key = { _, it -> it.id }) { index, item -> Row(index, item) }

    stickyHeader(key = "x") { Sticky() }
}
```

Extract item blocks into `fun LazyListScope.myItems(...)` extensions to keep the DSL clean:

```kotlin
fun LazyListScope.farmSection(farm: Farm) {
    item(key = "header-${farm.id}") { FarmHeader(farm) }
    items(farm.fields, key = { it.id }) { FieldRow(it) }
}
```

## Common Traps

**Trap: forgetting `key` when items can reorder.** Silent corruption of per-item state.

**Trap: wrapping the list in `Column(Modifier.verticalScroll())`.** Breaks measurement.

**Trap: heavy composables inside `item { }` that read high-frequency state.** Move reads into lambdas (`graphicsLayer { scroll.value }`) or extract to a separate composable whose skippability the compiler can verify.

**Trap: creating unstable lambdas per item.**

```kotlin
// BUG — new lambda every composition, defeats item skipping
items(fields, key = { it.id }) { field ->
    FieldRow(field, onClick = { viewModel.select(field.id) })
}

// Better — pass the id, capture the stable viewModel reference
items(fields, key = { it.id }) { field ->
    FieldRow(field, onClick = viewModel::select)
}
```

(Only strictly necessary when profiling shows a problem — Strong Skipping Mode remembers lambdas that don't capture unstable state. But passing a method reference is cleaner regardless.)
