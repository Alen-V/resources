# Stadia Maps Styles (Android)

Numanac uses Stadia Maps as the tile provider. The active style is selected at build time via the `STADIA_MAPS_STYLE` `BuildConfig` field, and the API key via `STADIA_MAPS_API_KEY`. Both are read by `MapHelpers.styleURL` and wired through Gradle — the mirror of the iOS `xcconfig` setup.

## Style URL format

```
https://tiles.stadiamaps.com/styles/{styleID}.json?api_key={YOUR-API-KEY}
```

Numanac builds it via `android.net.Uri.Builder` in `MapHelpers.kt`:

```kotlin
import android.net.Uri
import com.numanac.android.BuildConfig

object MapHelpers {
    val styleURL: String
        get() = Uri.Builder()
            .scheme("https")
            .authority("tiles.stadiamaps.com")
            .appendPath("styles")
            .appendPath("${BuildConfig.STADIA_MAPS_STYLE}.json")
            .appendQueryParameter("api_key", BuildConfig.STADIA_MAPS_API_KEY)
            .build()
            .toString()
}
```

Gradle wiring (module-level `build.gradle.kts`):

```kotlin
android {
    defaultConfig {
        buildConfigField("String", "STADIA_MAPS_STYLE", "\"${project.stadiaStyle}\"")
        buildConfigField("String", "STADIA_MAPS_API_KEY", "\"${project.stadiaKey}\"")
    }
    buildFeatures { buildConfig = true }
}
```

`project.stadiaStyle` / `project.stadiaKey` are read from `local.properties` or CI secrets — never committed.

**Never hand-build the URL elsewhere** — always go through `MapHelpers.styleURL`.

## Available styles

| `styleID` | Type | Description | Notes |
|---|---|---|---|
| `alidade_satellite` | **Raster** | Satellite imagery base with labels and major-feature outlines layered on top | **Numanac default** — aerial photography for field viewing |
| `alidade_smooth` | Vector | Muted color palette designed for marker/overlay-heavy maps | Good when many markers obscure the base |
| `alidade_smooth_dark` | Vector | Dark variant of `alidade_smooth` | Dark mode interfaces |
| `outdoors` | Vector | Highlights ski slopes, mountains, parks, and paths (OSM Bright base) | Outdoor-activity apps |
| `osm_bright` | Vector | General-purpose, highlights map content itself | Directions, minimal overlays |
| `stamen_toner` | Vector | High-contrast B+W | Data visualization base |
| `stamen_terrain` | Vector | Hill shading + natural vegetation colors | Topography emphasis |
| `stamen_watercolor` | Raster | Hand-drawn aesthetic, organic edges | Decorative |

## Raster vs vector

- **Raster styles** (`alidade_satellite`, `stamen_watercolor`) — the style JSON declares `raster` sources with pre-rendered tile images. MapLibre Native renders them directly; no vector symbolization happens on device. Typically heavier on cache because each tile is a full image.
- **Vector styles** (everything else) — style JSON declares `vector` sources pointing at `.pbf` tilesets. MapLibre Native rasterizes on device per the layer rules, so styling can be overridden at runtime (e.g., tint a road layer) and cache is leaner.

You pick whichever matches the use case — Numanac defaults to `alidade_satellite` because field boundary matching against real imagery is the core use case.

## Authentication

API keys are required for all mobile app usage. Stadia rewrites the stylesheet so all data sources requiring auth use your key — you only have to attach `?api_key=…` to the **stylesheet URL**, not to every tile request.

Two equivalent forms:

- Query string: `?api_key=YOUR-API-KEY` (used by Numanac)
- HTTP header: `Authorization: Stadia-Auth YOUR-API-KEY`

Domain-restricted browser auth does **not** apply to mobile apps — always use a key.

## Picking a style for Numanac

- **Field viewing / boundary editing** → `alidade_satellite` (current default). Imagery is essential for matching real-world field shapes.
- **Records / activity overview** → `alidade_smooth` would reduce visual noise around markers.
- **Dark mode** → `alidade_smooth_dark`.
- **Topography (slopes, drainage)** → `stamen_terrain` or `outdoors`.

To swap, change `STADIA_MAPS_STYLE` in `local.properties` (or the active build variant). No Kotlin change needed — `MapHelpers.styleURL` picks it up at build time. For runtime switching (e.g., user preference), see `numanac-conventions.md` — the `StadiaStyle` enum is persisted via DataStore and observed by the `MapViewModel`.

## Attribution

Attribution is **mandatory**. `MapView` ships an attribution button and logo that handle this automatically via `UiSettings`:

```kotlin
mapLibreMap.uiSettings.apply {
    isAttributionEnabled = true
    isLogoEnabled = true
}
```

Do not disable either. Required text (vector / OSM-derived styles):

> © Stadia Maps © OpenMapTiles © OpenStreetMap

When using **`alidade_satellite`** (or any imagery-based style), add:

> © CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data)

If you build a custom about/credits screen elsewhere in the app, mirror the strings above verbatim.

## Tile URL format (informational)

You generally don't need this — the style JSON tells MapLibre which tile URLs to fetch — but for reference:

```
https://tiles.stadiamaps.com/tiles/{styleID}/{z}/{x}/{y}{r}.png
```

Format varies by style: vector tiles use `.pbf`, raster styles use `.png` or `.jpg`, and `{r}` is the optional retina suffix (`@2x`).

## Related

- `maplibre-compose.md` — how to pass the style URL to `MaplibreMap`
- `stadia-tos-caching.md` — caching rules that apply regardless of style
- `numanac-conventions.md` — where `MapHelpers.kt` lives in the module layout
