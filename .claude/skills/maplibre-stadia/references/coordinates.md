# Coordinates: EPSG:3857 ↔ WGS84

Numanac stores **all field, farm, and tract coordinates in EPSG:3857** (Web Mercator) on the Convex backend. MapLibre Native (and `CLLocationCoordinate2D`) work in **WGS84** (EPSG:4326). You must convert at the boundary.

## Constants

- WGS84 semi-major axis: `6_378_137.0` meters
- 3857 origin: equator + prime meridian
- 3857 valid latitude range: ±85.05112878° (clipped to keep Mercator finite)

## EPSG:3857 → WGS84

```swift
import Foundation
import CoreLocation

func wgs84(from mercator: CGPoint) -> CLLocationCoordinate2D {
    let R = 6_378_137.0
    let lon = (Double(mercator.x) / R) * (180.0 / .pi)
    let lat = (atan(exp(Double(mercator.y) / R)) * 2 - .pi / 2) * (180.0 / .pi)
    return CLLocationCoordinate2D(latitude: lat, longitude: lon)
}
```

## WGS84 → EPSG:3857

```swift
func mercator(from coord: CLLocationCoordinate2D) -> CGPoint {
    let R = 6_378_137.0
    let x = coord.longitude * .pi / 180 * R
    let clampedLat = max(-85.05112878, min(85.05112878, coord.latitude))
    let y = log(tan(.pi / 4 + clampedLat * .pi / 360)) * R
    return CGPoint(x: x, y: y)
}
```

## When to convert

- **Reading from Convex** (field boundary, farm point, tract polygon) → convert to WGS84 before passing to `MLNPolygonFeature`, `MLNPointFeature`, `CLLocationCoordinate2D(latitude:longitude:)`, or `MapViewCamera.center(...)`.
- **Writing to Convex** (drawn field boundary, farm location pin) → convert from WGS84 → 3857 before sending the mutation.
- **Within MapLibre** — never use 3857 values directly. The map will treat them as if they were lat/lon and points will appear in the wrong place (typically near (0,0) for small-magnitude inputs, or off-screen for large ones).

## Helpers

Look in `ios/Numanac/Numanac/Shared/Helpers/MapHelpers.swift` for the project's coordinate helpers. Reuse those over re-implementing the math at call sites — keep the conversion logic in one place.

## Why EPSG:3857?

The web frontend uses OpenLayers, which defaults to EPSG:3857 for projection. Storing coordinates in 3857 keeps the web side cheap (no per-render conversion) at the cost of conversion on iOS. This is a deliberate trade-off — do not "fix" it by converting Convex storage to WGS84 without coordinating with the web team.
