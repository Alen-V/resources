# Numanac iOS Map Conventions

This file documents the **stable** parts of the Numanac iOS map system. The offline tile system is currently being rewritten (as of 2026-04-12) and is **deliberately not documented here** to avoid stale content.

## Architecture overview

```
AppMapView (Views/AppMapView.swift)            ← top-level SwiftUI host
├── injects @State weatherModel, locationModel, mapModel, offlineDataService
├── reads dataModel, organizationModel, etc. from @Environment
├── ZStack
│   ├── AppMap()                               ← Components/AppMap.swift — actual MapView
│   └── AppTopBar()
└── sheets: FarmCreationSheet, ClientCreationSheet, MapFieldDrawingOverlay, CreateTractSheet
```

`AppMap.swift` is where `MapLibreSwiftUI.MapView` is constructed. It pulls the style URL from `MapHelpers.styleURL` and binds the camera to local `@State`.

## Style URL

Built dynamically from xcconfig:

- `STADIA_MAPS_API_KEY` — secret, per-environment
- `STADIA_MAPS_STYLE` — the Stadia style ID (e.g., `alidade_satellite`)

Both surface through `Info.plist` and are read by `MapHelpers.styleURL`. Never hardcode tile URLs in components — always go through `MapHelpers.styleURL`.

## State models

- **`MapModel`** — drawing state (`isDrawingField`, `isCreatingTract`, `layerView`), held by `AppMapView` and exposed via `@Environment`. Many files reference it; treat it as the canonical map-side state.
- **`LocationModel`** — wraps `CLLocationManager`; call `locationModel.requestPermission()` at view appearance.
- **`WeatherModel`** — overlay data, owned by `AppMapView`.
- **`OfflineDataService`** — JSON snapshot persistence for Client/Farm/Field. **Tile cache is separate** and being rewritten.

All four are `@State` at the `AppMapView` level and re-injected into descendants via `.environment(...)`.

## Coordinate convention

Convex stores coordinates as **EPSG:3857**. Convert to WGS84 before passing to MapLibre. See `coordinates.md`.

## Drawing field boundaries

Field-drawing flow uses the `MapFieldDrawingOverlay` sheet bound to `mapModel.isDrawingField`. The overlay collects taps and writes to `mapModel`; on commit the boundary is converted to 3857 and saved via Convex mutation.

## Adding a new map feature — checklist

When adding a new layer, source, or interaction:

1. **Place new components in `Components/<feature>/`**, not inline in `AppMap.swift` or `AppMapView.swift`.
2. **Use the DSL** (`ShapeSource`, `*StyleLayer`) — only drop to `unsafeMapViewControllerModifier` if the DSL doesn't cover what you need.
3. **Pick unique identifiers** for sources/layers; collisions silently overwrite.
4. **Convert 3857 → WGS84** at the data boundary if the data comes from Convex (see `coordinates.md`).
5. **Hoist toggles into `MapModel`** rather than threading bindings through every intermediate view.
6. Use `AppSpacing`, `AppRadius`, `AppFrame` from `AppTheme.swift` for any UI overlaying the map — no hardcoded `CGFloat`.
7. Shared helpers belong in `Shared/Helpers/MapHelpers.swift` (or a sibling), not inlined.
8. If a Swift file uses `convexClient`, it must `import ConvexMobile`.

## Things deliberately not documented (yet)

- **Tile caching / offline storage** — under active rewrite. Do not codify the previous `OfflineMapManager` design; it is being removed.
- **Network reachability for cellular tile downloads** — `Services/NetworkMonitor.swift` is currently untracked and may change shape during the offline rewrite.
- **Field boundary cache strategy** — depends on the new offline design.

Once the offline rewrite lands, add a `references/offline.md` to this skill summarizing the new design (cap, eviction policy, refresh cadence, cellular gating).
