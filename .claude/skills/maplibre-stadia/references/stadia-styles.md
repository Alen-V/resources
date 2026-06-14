# Stadia Maps Styles

Numanac uses Stadia Maps as the tile provider. The active style is selected at build time via the `STADIA_MAPS_STYLE` xcconfig variable, and the API key via `STADIA_MAPS_API_KEY`. Both are read by `MapHelpers.styleURL` and surfaced into `Info.plist`.

## Style URL format

```
https://tiles.stadiamaps.com/styles/{styleID}.json?api_key={YOUR-API-KEY}
```

Numanac builds it via `URLComponents` in `ios/Numanac/Numanac/Shared/Helpers/MapHelpers.swift`:

```swift
static var styleURL: URL {
    var components = URLComponents()
    components.scheme = "https"
    components.host = "tiles.stadiamaps.com"
    components.path = "/styles/\(AppConfig.variable("STADIA_MAPS_STYLE")).json"
    components.queryItems = [
        URLQueryItem(name: "api_key", value: AppConfig.variable("STADIA_MAPS_API_KEY"))
    ]
    guard let url = components.url else { preconditionFailure("Invalid style URL") }
    return url
}
```

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

To swap, change `STADIA_MAPS_STYLE` in the relevant xcconfig (`Debug.xcconfig`, `Release.xcconfig`). No code change needed — `MapHelpers.styleURL` picks it up at runtime.

## Attribution

Attribution is **mandatory**. The `MLNMapView` ships an `attributionButton` and `logoView` that handle this automatically — do not hide them.

Required text (vector / OSM-derived styles):

> © Stadia Maps © OpenMapTiles © OpenStreetMap

When using **`alidade_satellite`** (or any imagery-based style), add:

> © CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data)

The DSL's `MapView` exposes the attribution via the underlying view controller — leave `attributionButton.isHidden = false`. If you need a custom about/credits screen elsewhere in the app, mirror the strings above verbatim.

## Tile URL format (informational)

You generally don't need this — the style JSON tells MapLibre which tile URLs to fetch — but for reference:

```
https://tiles.stadiamaps.com/tiles/{styleID}/{z}/{x}/{y}{r}.png
```

Format varies by style: vector tiles use `.pbf`, raster styles use `.png` or `.jpg`, and `{r}` is the optional retina suffix (`@2x`).
