---
name: maplibre-stadia
description: Reference for MapLibre Native iOS, MapLibreSwiftUI DSL, and Stadia Maps usage in the Numanac iOS app. Use when adding map features, working with style/layer/source code, gesture handling, camera state, or anything touching AppMap / AppMapView. Excludes offline tile storage (currently being rewritten).
---

# MapLibre + Stadia Skill

Numanac iOS uses **MapLibre Native** (via the SPM package `maplibre-gl-native-distribution`), the **MapLibreSwiftUI DSL** (`github.com/maplibre/swiftui-dsl`), and **Stadia Maps** for tile delivery. The active style is configurable via the `STADIA_MAPS_STYLE` xcconfig variable; the API key comes from `STADIA_MAPS_API_KEY`.

## Operating rules

- Default to the SwiftUI DSL (`MapView`, `ShapeSource`, `*StyleLayer`). Drop down to raw `MLNMapView` only via `.unsafeMapViewControllerModifier { vc in ... }`.
- Style URL is built by `MapHelpers.styleURL` — never hardcode tile URLs anywhere else.
- All field/farm/tract coordinates in Convex are stored as **EPSG:3857**. Convert to WGS84 (`CLLocationCoordinate2D`) before passing anything to MapLibre.
- Stadia caching has hard ToS limits: max 100 MB cached per device, max 7-day TTL, no server-side caching, no bulk pre-download. See `references/stadia-tos-caching.md` before touching cache logic.
- New `ShapeSource` / layer identifiers must be unique across the active style — collisions silently overwrite.
- Use `NSExpression` for zoom-based interpolation in line/circle/symbol layers — see `references/maplibre-swiftui-dsl.md` for the pattern.
- Never hide `attributionButton` or `logoView` on the underlying `MLNMapView` — Stadia attribution is mandatory.

## Topic Router

| Task | Reference |
|---|---|
| Build a `MapView` with sources, layers, gestures, camera | `references/maplibre-swiftui-dsl.md` |
| Need a raw MapLibre Native iOS API (delegate callbacks, MLNMapView properties) | `references/maplibre-native-ios.md` |
| Pick or change a Stadia tile style; understand the URL format | `references/stadia-styles.md` |
| Tile caching, offline behavior, ToS compliance | `references/stadia-tos-caching.md` |
| Convert EPSG:3857 ↔ WGS84 | `references/coordinates.md` |
| How AppMap / AppMapView is wired in Numanac | `references/numanac-conventions.md` |

## Out of scope

- **Offline tile storage / `MLNOfflineStorage`** — being rewritten as of 2026-04-12. This skill will be updated once the new design lands. Do not codify the previous `OfflineMapManager` design.
- **Apple MapKit** — Numanac does not use it.
- **3D terrain / globe view** — not enabled in this app.
- **Vector tile schema editing** — Stadia ships their own schemas; we consume styles, we don't author them.
