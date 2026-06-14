# Numanac Android Map Conventions

**This file is forward-looking.** The Numanac Android app does not exist yet as of 2026-04-14 — the map surface is its starting point. The structure below describes the target architecture and is prescriptive, not descriptive. Update as implementations land.

It mirrors the iOS `AppMap` / `AppMapView` organization: a thin stateless top-level composable, a Hilt-injected ViewModel holding state, and a dedicated composable for the actual `MaplibreMap` contents.

## Module layout

```
app/                                  ← application module (Hilt entry point, nav graph root)
core/
├── design/                           ← Material 3 theme, AppSpacing / AppRadius / AppFrame
├── geo/                              ← CoordinateConversions.kt, Mercator helpers
├── convex/                           ← Convex client wrapper, DTO mapping
└── ui/                               ← Shared composables, modifiers
feature/
└── map/
    ├── src/main/kotlin/com/numanac/android/feature/map/
    │   ├── MapScreen.kt              ← stateless top-level composable
    │   ├── MapContent.kt             ← MaplibreMap + sources + layers
    │   ├── MapViewModel.kt           ← Hilt-injected; StateFlow<MapUiState>
    │   ├── MapUiState.kt             ← sealed + data class state model
    │   ├── MapEvent.kt               ← sealed class of user intents
    │   ├── MapRepository.kt          ← Flow<List<Farm>> / Flow<List<Field>>, 3857 → WGS84 conversion here
    │   ├── MapHelpers.kt             ← styleURL builder, icon registration
    │   └── components/               ← FarmPinLayer, FieldBoundariesLayer, MapTopBar, ...
    └── build.gradle.kts
```

## `MapScreen.kt` — stateless composable

Takes the UI state and event callbacks. No direct Convex access, no ViewModel creation — that happens at the nav graph or parent screen level.

```kotlin
@Composable
fun MapScreen(
    state: MapUiState,
    onEvent: (MapEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier.fillMaxSize()) {
        MapContent(state = state, onEvent = onEvent)
        MapTopBar(
            style = state.style,
            onStyleSelected = { onEvent(MapEvent.StyleSelected(it)) },
            modifier = Modifier.align(Alignment.TopCenter),
        )
    }
}
```

At the nav graph:

```kotlin
composable<MapRoute> {
    val viewModel: MapViewModel = hiltViewModel()
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    MapScreen(state = state, onEvent = viewModel::onEvent)
}
```

## `MapViewModel.kt` — state owner

```kotlin
@HiltViewModel
class MapViewModel @Inject constructor(
    private val repository: MapRepository,
    private val stylePrefs: StylePreferences,
) : ViewModel() {

    val uiState: StateFlow<MapUiState> = combine(
        repository.farms,
        repository.fields,
        stylePrefs.selectedStyle,
    ) { farms, fields, style ->
        MapUiState(
            styleUrl = MapHelpers.styleURL(style),
            farms = farms,
            fields = fields,
            style = style,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MapUiState.Initial)

    fun onEvent(event: MapEvent) {
        when (event) {
            is MapEvent.StyleSelected -> viewModelScope.launch { stylePrefs.set(event.style) }
            is MapEvent.FieldTapped -> { /* ... */ }
            is MapEvent.MapLongPressed -> { /* ... */ }
        }
    }
}
```

## `MapContent.kt` — the actual map

Hosts `MaplibreMap` with its sources and layers. Keep layer ordering explicit: fills first, lines second, symbols last.

```kotlin
@Composable
internal fun MapContent(
    state: MapUiState,
    onEvent: (MapEvent) -> Unit,
) {
    val camera = rememberCameraState(
        firstPosition = CameraPosition(target = state.initialTarget, zoom = 14.0),
    )
    val fieldFeatures = remember(state.fields) { state.fields.toFeatureCollection() }
    val farmFeatures = remember(state.farms) { state.farms.toFeatureCollection() }

    MaplibreMap(
        styleUrl = state.styleUrl,
        cameraState = camera,
        modifier = Modifier.fillMaxSize(),
        onMapClick = { _, screenPoint ->
            val feature = camera.queryRenderedFeatures(
                screenPoint = screenPoint,
                layerIds = listOf("field-boundaries-fill"),
            ).firstOrNull()
            feature?.getStringProperty("id")?.let { onEvent(MapEvent.FieldTapped(it)) } != null
        },
        onMapLongClick = { latLng, _ ->
            onEvent(MapEvent.MapLongPressed(latLng))
            true
        },
    ) {
        GeoJsonSource(id = "field-boundaries", data = fieldFeatures)
        GeoJsonSource(id = "farm-pins", data = farmFeatures, cluster = true, clusterRadius = 44)

        FillLayer(id = "field-boundaries-fill", source = "field-boundaries", /* ... */)
        LineLayer(id = "field-boundaries-line", source = "field-boundaries", /* ... */)

        CircleLayer(id = "farm-pins-clusters", source = "farm-pins", filter = has("point_count"), /* ... */)
        CircleLayer(id = "farm-pins-points", source = "farm-pins", filter = not(has("point_count")), /* ... */)
        SymbolLayer(id = "farm-labels", source = "farm-pins", /* ... */)
    }
}
```

## `MapRepository.kt` — the conversion boundary

The repository is where EPSG:3857 → WGS84 happens. `MapViewModel` and every composable downstream of it only sees `LatLng` / `Polygon`:

```kotlin
class MapRepository @Inject constructor(
    private val convex: ConvexClient,
) {
    val farms: Flow<List<Farm>> = convex
        .subscribe<List<FarmDto>>("farmFunctions:listForUser")
        .map { list -> list.map { it.toDomain() } }  // 3857 → WGS84 inside toDomain()

    val fields: Flow<List<Field>> = convex
        .subscribe<List<FieldDto>>("fieldFunctions:listForUser")
        .map { list -> list.map { it.toDomain() } }
}

private fun FieldDto.toDomain(): Field = Field(
    id = id,
    name = name,
    boundary = boundary.map { ring ->
        ring.map { (x, y) -> mercatorToLatLng(x, y) }
    },
)
```

**Never** leak 3857 coordinates past the repository boundary. Domain types hold `LatLng`, never `Pair<Double, Double>` of raw Mercator values.

## Style switching

```kotlin
enum class StadiaStyle(val slug: String) {
    AlidadeSatellite("alidade_satellite"),
    AlidadeSmooth("alidade_smooth"),
    AlidadeSmoothDark("alidade_smooth_dark"),
    Outdoors("outdoors"),
    OsmBright("osm_bright"),
    StamenToner("stamen_toner"),
    StamenTerrain("stamen_terrain"),
}

class StylePreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    private val key = stringPreferencesKey("stadia_style")

    val selectedStyle: Flow<StadiaStyle> = dataStore.data.map { prefs ->
        prefs[key]?.let { slug -> StadiaStyle.entries.firstOrNull { it.slug == slug } }
            ?: StadiaStyle.AlidadeSatellite
    }

    suspend fun set(style: StadiaStyle) {
        dataStore.edit { it[key] = style.slug }
    }
}
```

`MapHelpers.styleURL` accepts an optional style override so runtime switching works without rebuilding:

```kotlin
object MapHelpers {
    fun styleURL(style: StadiaStyle = StadiaStyle.entries.first { it.slug == BuildConfig.STADIA_MAPS_STYLE }): String =
        Uri.Builder()
            .scheme("https")
            .authority("tiles.stadiamaps.com")
            .appendPath("styles")
            .appendPath("${style.slug}.json")
            .appendQueryParameter("api_key", BuildConfig.STADIA_MAPS_API_KEY)
            .build()
            .toString()
}
```

## Adding a new map feature — checklist

1. **Place new components in `feature/map/components/<feature>/`**, not inline in `MapContent.kt` or `MapScreen.kt`.
2. **Use the DSL** (`GeoJsonSource`, `*Layer`) — only drop to raw `MapLibreMap` via `onStyleLoaded` if the DSL doesn't cover what you need.
3. **Pick unique identifiers** for sources/layers; collisions silently overwrite. Namespace per feature (`field-`, `farm-`, `tract-`).
4. **Convert 3857 → WGS84 inside `MapRepository`.** Domain types expose WGS84 only.
5. **Hoist toggles into `MapUiState`** rather than threading state through every intermediate composable.
6. Use `AppSpacing`, `AppRadius`, `AppFrame` from `core/design` for any UI overlaying the map — no hardcoded `Dp`.
7. Shared helpers belong in `core/geo` (coordinate math) or `feature/map/MapHelpers.kt` (style / icon helpers), not inlined at call sites.
8. Every `@Composable` that directly references `camera.position` / `camera.animateTo` should accept `cameraState: CameraState` as a parameter, not hold its own. The top-level `MapContent` is the only `rememberCameraState` call site.

## Convex + Compose

- Subscriptions go through `MapRepository` exposing `Flow<List<...>>`. The ViewModel `combine`s those flows with preferences to produce `MapUiState`.
- Mutations (create farm, save drawn field) go through a domain usecase (`SaveFieldBoundary`), which converts WGS84 → 3857 before calling the Convex mutation.
- UI state is immutable data classes; every user gesture flows through `MapEvent` → `MapViewModel.onEvent` → state update.

## Things deliberately not documented (yet)

- **Tile caching / offline storage** — strategy hasn't been designed. Do not introduce `OfflineManager` usage without a separate design pass. See `stadia-tos-caching.md`.
- **Field boundary cache strategy** — depends on the offline design.
- **Cellular download gating** — UX decision pending alongside the offline design.

Once the offline design lands, add a `references/offline.md` to this skill summarizing the chosen approach (cap, eviction policy, refresh cadence, cellular gating), and update this file's module layout to include the cache module.

## Keeping parity with iOS

When a feature ships on both platforms, keep the identifiers aligned:

| iOS | Android |
|---|---|
| `AppMapView` | `MapScreen` |
| `AppMap` | `MapContent` |
| `MapModel` | `MapUiState` + `MapViewModel` |
| `MapHelpers.styleURL` (Swift) | `MapHelpers.styleURL` (Kotlin) |
| `ShapeSource` id `"field-boundaries"` | `GeoJsonSource` id `"field-boundaries"` |
| `FillStyleLayer` id `"field-boundaries-fill"` | `FillLayer` id `"field-boundaries-fill"` |

Matching identifiers on both platforms makes cross-platform debugging (e.g., shared Convex subscription payloads) easier.
