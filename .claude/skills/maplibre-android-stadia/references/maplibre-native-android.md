# MapLibre Native Android — Raw API Reference

The `maplibre-compose` DSL covers most needs. This file is for the cases where you have to drop into raw MapLibre Native types — typically inside an `AndroidView { MapView(context) }` wrapper, or inside `onStyleLoaded` on the DSL for style introspection / `LocationComponent` configuration.

## Imports

```kotlin
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.location.modes.CameraMode
import org.maplibre.android.location.modes.RenderMode
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.OnMapReadyCallback
import org.maplibre.android.maps.Style
import org.maplibre.android.maps.UiSettings
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
```

Gradle dependency:

```kotlin
implementation("org.maplibre.gl:android-sdk:11.x.x")
```

## SDK initialization

Call once per process (e.g., in `Application.onCreate`) before inflating any `MapView`:

```kotlin
class NumanacApp : Application() {
    override fun onCreate() {
        super.onCreate()
        MapLibre.getInstance(this)
    }
}
```

## `MapView` + `AndroidView` in Compose

When the DSL can't express something, host `MapView` yourself. Lifecycle callbacks must be forwarded explicitly:

```kotlin
@Composable
fun RawMapView(styleUrl: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    val mapView = remember { MapView(context) }

    DisposableEffect(lifecycle, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
            mapView.onDestroy()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = {
            mapView.apply {
                onCreate(null)
                getMapAsync { mapLibreMap ->
                    mapLibreMap.setStyle(styleUrl) { style ->
                        configure(mapLibreMap, style)
                    }
                }
            }
        },
    )
}
```

Required lifecycle forwards when using `MapView` directly: `onCreate`, `onStart`, `onResume`, `onPause`, `onStop`, `onDestroy`, `onLowMemory`, `onSaveInstanceState`.

## `MapLibreMap`

The controller returned by `getMapAsync`. Common properties and methods:

- `setStyle(url, callback)` — swap style at runtime; callback receives the new `Style`
- `style: Style?` — populated after style load
- `cameraPosition: CameraPosition`
- `animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, zoom), durationMs)`
- `moveCamera(CameraUpdateFactory.newCameraPosition(position))`
- `easeCamera(...)` — linear ease, no acceleration curve
- `uiSettings: UiSettings` — gesture / attribution / logo config
- `locationComponent: LocationComponent` — user location puck
- `addOnMapClickListener(listener)`, `addOnMapLongClickListener(listener)`
- `addOnCameraMoveListener(listener)`, `addOnCameraIdleListener(listener)`
- `projection: Projection` — `toScreenLocation(LatLng)`, `fromScreenLocation(PointF)`, `getVisibleRegion()`

## `UiSettings` — attribution and logo are mandatory

```kotlin
mapLibreMap.uiSettings.apply {
    isAttributionEnabled = true      // Stadia attribution - must stay true
    isLogoEnabled = true             // Stadia logo - must stay true
    isCompassEnabled = true
    isRotateGesturesEnabled = true
    isTiltGesturesEnabled = true
    isZoomGesturesEnabled = true
    isScrollGesturesEnabled = true
    setAttributionMargins(16, 0, 0, 16)
}
```

Never set `isAttributionEnabled = false` or `isLogoEnabled = false` — Stadia ToS requires both visible.

## `Style` — sources and layers

After style load you can inspect, add, or replace sources/layers:

```kotlin
mapLibreMap.getStyle { style ->
    val existing = style.getLayer("place-city") as? SymbolLayer

    val source = GeoJsonSource("field-boundaries", featureCollection)
    style.addSource(source)

    val fill = FillLayer("field-boundaries-fill", "field-boundaries").withProperties(
        PropertyFactory.fillColor(Color.parseColor("#4CAF50")),
        PropertyFactory.fillOpacity(0.25f),
    )
    style.addLayerBelow(fill, "place-city")
}
```

Dynamic updates to an existing source:

```kotlin
val source = style.getSourceAs<GeoJsonSource>("field-boundaries") ?: return@getStyle
source.setGeoJson(newFeatureCollection)
```

**Pitfall:** `getLayer` / `getSource` return `null` if the style isn't ready yet, or if the identifier doesn't match. Always null-check before casting.

## `Expression` — zoom-based interpolation

Android's equivalent of iOS `NSExpression`:

```kotlin
LineLayer("field-boundaries-line", "field-boundaries").withProperties(
    PropertyFactory.lineWidth(
        Expression.interpolate(
            Expression.exponential(1.5f),
            Expression.zoom(),
            Expression.stop(14f, 1.5f),
            Expression.stop(18f, 4.0f),
        ),
    ),
    PropertyFactory.lineColor(Expression.get("color")),
)
```

Common expression patterns:

| Pattern | Builder |
|---|---|
| Constant | `Expression.literal(value)` |
| Feature property | `Expression.get("name")` |
| Zoom-based interpolation | `Expression.interpolate(Expression.exponential(n), Expression.zoom(), stops...)` |
| Conditional | `Expression.match(Expression.get("kind"), Expression.literal("a"), ..., default)` |
| Type coercion | `Expression.toNumber(Expression.get("count"))` |
| Cluster predicate | `Expression.has("point_count")` / `Expression.not(Expression.has("point_count"))` |

## Click / long-click listeners

```kotlin
mapLibreMap.addOnMapClickListener { latLng ->
    val screenPoint = mapLibreMap.projection.toScreenLocation(latLng)
    val features = mapLibreMap.queryRenderedFeatures(screenPoint, "field-boundaries-fill")
    features.firstOrNull()?.getStringProperty("id")?.let(onFieldTap)
    true
}

mapLibreMap.addOnMapLongClickListener { latLng ->
    onLongPress(latLng)
    true
}
```

Return `true` to consume; `false` to let the next listener run.

## Camera updates

```kotlin
mapLibreMap.animateCamera(
    CameraUpdateFactory.newLatLngZoom(LatLng(42.85, -88.13), 14.0),
    400,
)

mapLibreMap.animateCamera(
    CameraUpdateFactory.newLatLngBounds(
        LatLngBounds.Builder()
            .include(LatLng(sw.latitude, sw.longitude))
            .include(LatLng(ne.latitude, ne.longitude))
            .build(),
        padding = 64,
    ),
    400,
)
```

## `LocationComponent` — user location puck

Must be activated after a style is loaded. Requires `ACCESS_FINE_LOCATION` permission granted before activation:

```kotlin
mapLibreMap.getStyle { style ->
    mapLibreMap.locationComponent.activateLocationComponent(
        LocationComponentActivationOptions.builder(context, style)
            .useDefaultLocationEngine(true)
            .build(),
    )
    mapLibreMap.locationComponent.isLocationComponentEnabled = true
    mapLibreMap.locationComponent.cameraMode = CameraMode.TRACKING
    mapLibreMap.locationComponent.renderMode = RenderMode.COMPASS
}
```

Camera modes: `NONE`, `TRACKING`, `TRACKING_COMPASS`, `TRACKING_GPS`, `TRACKING_GPS_NORTH`.
Render modes: `NORMAL` (dot), `COMPASS` (dot + chevron), `GPS` (arrow).

## `Projection` — coordinate ↔ screen conversion

```kotlin
val screenPt: PointF = mapLibreMap.projection.toScreenLocation(latLng)
val mapPt: LatLng = mapLibreMap.projection.fromScreenLocation(pointF)
val bounds: VisibleRegion = mapLibreMap.projection.visibleRegion
```

Screen coords are in **pixels** (not dp); convert if you're mixing with Compose layout math.

## When to drop to raw API vs stay in DSL

| Need | Use |
|---|---|
| Static layers, sources, gestures | DSL |
| Feature-driven styling | DSL (with expression helpers) |
| Camera tracking user location | Raw `LocationComponent` (DSL only wraps basic camera) |
| Mid-frame mutating an existing source | Raw `GeoJsonSource.setGeoJson(...)` inside `onStyleLoaded` or stored reference |
| `UiSettings` tweaks (margins, gesture toggles beyond defaults) | Raw |
| `queryRenderedFeatures` for hit testing | Both — DSL exposes on `CameraState`, raw via `MapLibreMap.projection` |
| Style introspection (`Style.layers`, `.sources`) | Raw |
| Arbitrary `MapLibreMap` listeners not exposed by DSL | Raw |
