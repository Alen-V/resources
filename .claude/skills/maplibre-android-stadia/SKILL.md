---
name: maplibre-android-stadia
description: Reference for MapLibre Native Android, the maplibre-compose DSL, and Stadia Maps usage in the Numanac Android app (forthcoming). Use when building the Android map surface, working with style/layer/source code, gesture handling, camera state, or anything touching the MapScreen/MapViewModel stack. Excludes offline tile storage (strategy pending, not yet codified).
---

# MapLibre + Stadia Skill (Android)

Numanac Android uses **MapLibre Native Android** (`org.maplibre.gl:android-sdk:11.x`), the **`dev.sargunv.maplibre-compose` DSL** (`MaplibreMap`, `GeoJsonSource`, `*Layer`), and **Stadia Maps** for tile delivery. The active style is configurable via the `STADIA_MAPS_STYLE` `BuildConfig` field; the API key comes from `STADIA_MAPS_API_KEY`. Both are wired through Gradle as `buildConfigField` entries — the mirror of the iOS `xcconfig` setup.

## Operating rules

- Default to the `maplibre-compose` DSL (`MaplibreMap`, `GeoJsonSource`, `FillLayer`, `LineLayer`, `CircleLayer`, `SymbolLayer`). Drop down to raw `MapView` / `MapLibreMap` via `AndroidView` + `getMapAsync` only when the DSL can't express what you need.
- Style URL is built by `MapHelpers.styleURL` — never hardcode tile URLs or compose the style URL anywhere else.
- All field/farm/tract coordinates in Convex are stored as **EPSG:3857**. Convert to WGS84 (`org.maplibre.android.geometry.LatLng`) before passing anything to MapLibre.
- Stadia caching has hard ToS limits: max 100 MB cached per device, max 7-day TTL, no server-side caching, no bulk pre-download. See `references/stadia-tos-caching.md` before touching cache logic.
- New `GeoJsonSource` / layer IDs must be unique across the active style — collisions silently overwrite. Namespace by feature (e.g., `"field-boundaries"`, `"field-boundaries-fill"`, `"field-boundaries-line"`).
- Use MapLibre `Expression.interpolate` + `Expression.zoom()` for zoom-based interpolation in line/circle/symbol layers — see `references/maplibre-compose.md` for the pattern.
- Never disable `attributionEnabled` / `logoEnabled` on `UiSettings` (or the DSL equivalents) — Stadia attribution is mandatory.

## Topic Router

| Task | Reference |
|---|---|
| Build a `MaplibreMap` with sources, layers, gestures, camera | `references/maplibre-compose.md` |
| Need a raw MapLibre Native Android API (listeners, `MapLibreMap` properties, `Style.addLayer`) | `references/maplibre-native-android.md` |
| Pick or change a Stadia tile style; understand the URL format | `references/stadia-styles.md` |
| Tile caching, offline behavior, ToS compliance | `references/stadia-tos-caching.md` |
| Convert EPSG:3857 ↔ WGS84 | `references/coordinates.md` |
| How `MapScreen` / `MapViewModel` / `MapContent` should be wired in Numanac Android | `references/numanac-conventions.md` |

## Out of scope

- **Offline tile storage / `OfflineManager` / `OfflineRegion`** — the Android offline strategy is not yet designed as of 2026-04-14. This skill will be updated once the approach lands. Do not introduce an offline implementation without a separate design pass.
- **Google Maps SDK** — Numanac Android will not use it. MapLibre only.
- **3D terrain / globe view** — not enabled in this app.
- **Vector tile schema editing** — Stadia ships their own schemas; we consume styles, we don't author them.
