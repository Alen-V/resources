# Coordinates: EPSG:3857 ↔ WGS84 (Android)

Numanac stores **all field, farm, and tract coordinates in EPSG:3857** (Web Mercator) on the Convex backend. MapLibre Native Android (and `org.maplibre.android.geometry.LatLng`) work in **WGS84** (EPSG:4326). You must convert at the boundary.

## Constants

- WGS84 semi-major axis: `6_378_137.0` meters
- 3857 origin: equator + prime meridian
- 3857 valid latitude range: ±85.05112878° (clipped to keep Mercator finite)
- Max extent: `20_037_508.342_789_244` meters on both axes (half circumference)

```kotlin
object CoordinateConstants {
    const val RADIUS = 6_378_137.0
    const val MAX_EXTENT = 20_037_508.342_789_244
    const val MAX_LATITUDE = 85.05112878
}
```

## EPSG:3857 → WGS84

```kotlin
import org.maplibre.android.geometry.LatLng
import kotlin.math.PI
import kotlin.math.atan
import kotlin.math.exp

fun mercatorToLatLng(x: Double, y: Double): LatLng {
    val lon = (x / CoordinateConstants.RADIUS) * (180.0 / PI)
    val lat = (atan(exp(y / CoordinateConstants.RADIUS)) * 2 - PI / 2) * (180.0 / PI)
    return LatLng(lat, lon)
}
```

## WGS84 → EPSG:3857

```kotlin
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.tan

fun latLngToMercator(lat: Double, lng: Double): Pair<Double, Double> {
    val x = lng * PI / 180.0 * CoordinateConstants.RADIUS
    val clampedLat = max(-CoordinateConstants.MAX_LATITUDE, min(CoordinateConstants.MAX_LATITUDE, lat))
    val y = ln(tan(PI / 4 + clampedLat * PI / 360.0)) * CoordinateConstants.RADIUS
    return x to y
}
```

## Polygon arrays

Convex stores field boundaries as `number[][][]` — an array of rings, each ring an array of `[x, y]` pairs in EPSG:3857. Convert ring-by-ring into `List<List<LatLng>>` or directly into a `Polygon`:

```kotlin
import org.maplibre.geojson.Point
import org.maplibre.geojson.Polygon

fun Field.toPolygon(): Polygon {
    val rings: List<List<Point>> = boundary.map { ring ->
        ring.map { pair ->
            val (x, y) = pair  // pair = [Double, Double]
            val latLng = mercatorToLatLng(x, y)
            Point.fromLngLat(latLng.longitude, latLng.latitude)
        }
    }
    return Polygon.fromLngLats(rings)
}
```

**Note the lng/lat order** when constructing `Point.fromLngLat` — GeoJSON is `(longitude, latitude)`, not the intuitive `(latitude, longitude)`. `LatLng` uses `(latitude, longitude)`. Mixing these is the most common source of "my feature appeared in the wrong hemisphere" bugs.

## When to convert

- **Reading from Convex** (field boundary, farm point, tract polygon) → convert to WGS84 before passing to `LatLng(...)`, `Point.fromLngLat(...)`, `Polygon.fromLngLats(...)`, `CameraPosition.Builder().target(...)`, or any `GeoJsonSource` feature.
- **Writing to Convex** (drawn field boundary, farm location pin) → convert from WGS84 → 3857 before sending the mutation.
- **Within MapLibre** — never use 3857 values directly. The map will treat them as if they were lat/lon and points will appear in the wrong place (typically near (0,0) for small-magnitude inputs, or off-screen for large ones).

## Helpers

The project's coordinate helpers live in `core/geo/src/main/kotlin/com/numanac/android/core/geo/CoordinateConversions.kt` (target location — see `numanac-conventions.md` for the full module layout). Reuse those over re-implementing the math at call sites — keep the conversion logic in one place.

## Common pitfalls

- **Lat/lng vs lng/lat order.** `LatLng(lat, lon)` vs `Point.fromLngLat(lng, lat)`. Read every constructor's parameter order.
- **Degrees vs radians.** All `LatLng` values are degrees. `kotlin.math` trig functions take radians — convert with `* PI / 180.0` going in, `* 180.0 / PI` coming out.
- **Float vs Double.** Always use `Double` for coordinate math. `Float` loses precision at meter scale over Mercator's 20M-meter extent.
- **Un-clamped latitude.** Lat outside ±85.05° produces `Infinity` / `NaN` after `ln(tan(...))`. Clamp before the conversion.
- **Forgetting to convert nested rings.** `boundary: number[][][]` has three levels — ring, point, xy. Map ring-by-ring, not point-by-point on the flattened list, or you'll lose the ring structure.

## Why EPSG:3857?

The web frontend uses OpenLayers, which defaults to EPSG:3857 for projection. Storing coordinates in 3857 keeps the web side cheap (no per-render conversion) at the cost of conversion on iOS and Android. This is a deliberate trade-off — do not "fix" it by converting Convex storage to WGS84 without coordinating with the web team.
