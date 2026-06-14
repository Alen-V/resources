# maplibre-compose DSL

Package: `dev.sargunv.maplibre-compose` (Maven Central / GitHub `sargunv/maplibre-compose`)
Gradle (module-level `build.gradle.kts`):

```kotlin
dependencies {
    implementation("dev.sargunv.maplibre-compose:maplibre-compose:x.y.z")
    implementation("org.maplibre.gl:android-sdk:11.x.x")
}
```

Modules used in typical code:

- `dev.sargunv.maplibrecompose.compose.MaplibreMap`
- `dev.sargunv.maplibrecompose.compose.CameraState`, `rememberCameraState`
- `dev.sargunv.maplibrecompose.compose.source.GeoJsonSource`, `VectorSource`, `RasterSource`
- `dev.sargunv.maplibrecompose.compose.layer.FillLayer`, `LineLayer`, `CircleLayer`, `SymbolLayer`, `RasterLayer`
- `dev.sargunv.maplibrecompose.expressions.*`

Raw types still imported for features / geometry:

- `org.maplibre.android.geometry.LatLng`
- `org.maplibre.geojson.Feature`, `FeatureCollection`, `Point`, `LineString`, `Polygon`

## Minimal `MaplibreMap`

```kotlin
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import dev.sargunv.maplibrecompose.compose.MaplibreMap
import dev.sargunv.maplibrecompose.compose.rememberCameraState
import org.maplibre.android.geometry.LatLng

@Composable
fun BasicMap(styleUrl: String) {
    val camera = rememberCameraState(
        firstPosition = CameraPosition(
            target = LatLng(0.0, 0.0),
            zoom = 14.0,
        ),
    )

    MaplibreMap(
        styleUrl = styleUrl,
        cameraState = camera,
        modifier = Modifier.fillMaxSize(),
    ) {
        // Sources and layers go here (Composable content block)
    }
}
```

## Camera

`CameraState` is the camera type. Always hoist it with `rememberCameraState` and pass it in — do NOT construct fresh `CameraPosition`s on every recomposition, the map will snap.

```kotlin
val camera = rememberCameraState(
    firstPosition = CameraPosition(
        target = LatLng(latitude = 42.85, longitude = -88.13),
        zoom = 14.0,
    ),
)

MaplibreMap(styleUrl = styleUrl, cameraState = camera) { /* ... */ }
```

Programmatic moves are suspending calls against the state:

```kotlin
LaunchedEffect(targetCoord) {
    camera.animateTo(
        CameraPosition(target = targetCoord, zoom = 16.0),
        duration = 400.milliseconds,
    )
}
```

Observe style readiness via the map callback before issuing moves that depend on layers being present:

```kotlin
MaplibreMap(
    styleUrl = styleUrl,
    cameraState = camera,
    onStyleLoaded = { style -> /* safe to inspect style */ },
) { /* ... */ }
```

**Pitfall:** Constructing `CameraState()` inline (not via `rememberCameraState`) resets position on every recomposition. Always `remember`.

## Sources

### `GeoJsonSource`

Back a layer with one or more `Feature`s. This is the Android equivalent of iOS's `ShapeSource`:

```kotlin
val fieldFeatures: FeatureCollection = remember(fields) {
    FeatureCollection.fromFeatures(
        fields.map { field ->
            Feature.fromGeometry(
                Polygon.fromLngLats(field.boundary.map { ring ->
                    ring.map { (lng, lat) -> Point.fromLngLat(lng, lat) }
                }),
            ).apply {
                addStringProperty("id", field.id)
                addStringProperty("name", field.name)
            }
        },
    )
}

GeoJsonSource(
    id = "field-boundaries",
    data = fieldFeatures,
)
```

Clustering options:

```kotlin
GeoJsonSource(
    id = "farm-pins",
    data = farmFeatures,
    cluster = true,
    clusterRadius = 44,
    clusterMaxZoom = 14,
)
```

**Pitfall:** Building `FeatureCollection` inside the Composable body without `remember` allocates on every recomposition and forces the source to reload. Always wrap in `remember(key)` with stable keys.

## Layer types

### `FillLayer`

Polygon fills (field boundaries):

```kotlin
FillLayer(
    id = "field-boundaries-fill",
    source = "field-boundaries",
    fillColor = const(Color(0xFF4CAF50)),
    fillOpacity = const(0.25f),
)
```

Pair with a `LineLayer` on the same source for an outlined fill effect.

### `LineLayer`

Casing + inner pattern (routes, drawn polylines, field outlines):

```kotlin
LineLayer(
    id = "field-boundaries-casing",
    source = "field-boundaries",
    lineCap = const(LineCap.Round),
    lineJoin = const(LineJoin.Round),
    lineColor = const(Color.White),
    lineWidth = interpolate(
        type = InterpolateType.Exponential(1.5),
        input = zoom(),
        stops = listOf(14.0 to 6.0, 18.0 to 24.0),
    ),
)

LineLayer(
    id = "field-boundaries-inner",
    source = "field-boundaries",
    lineColor = const(Color(0xFF2196F3)),
    lineDasharray = const(listOf(2.0, 0.5)),
    lineWidth = interpolate(
        type = InterpolateType.Exponential(1.5),
        input = zoom(),
        stops = listOf(14.0 to 3.0, 18.0 to 16.0),
    ),
)
```

### `CircleLayer`

Pins / non-cluster points:

```kotlin
CircleLayer(
    id = "farm-pins-points",
    source = "farm-pins",
    filter = not(has("point_count")),
    circleRadius = const(16.0),
    circleColor = const(Color(0xFFE53935)),
    circleStrokeWidth = const(2.0),
    circleStrokeColor = const(Color.White),
)
```

### `SymbolLayer`

Android MapLibre has no standalone "marker DSL" — use `SymbolLayer` with an icon image for pin-like rendering. Register the icon in the style before referencing it:

```kotlin
MaplibreMap(
    styleUrl = styleUrl,
    cameraState = camera,
    onStyleLoaded = { style ->
        style.addImage("pin", AppCompatResources.getDrawable(context, R.drawable.ic_pin)!!)
    },
) {
    SymbolLayer(
        id = "farm-labels",
        source = "farm-pins",
        iconImage = const("pin"),
        iconAllowOverlap = const(true),
        textField = feature("name"),
        textSize = const(12.0),
        textColor = const(Color.White),
        textHaloColor = const(Color.Black),
        textHaloWidth = const(1.0),
        textOffset = const(listOf(0.0, 1.2)),
    )
}
```

Icon picked per feature attribute (equivalent of iOS `iconImage(featurePropertyNamed:mappings:)`):

```kotlin
SymbolLayer(
    id = "icons",
    source = "points",
    iconImage = match(
        input = feature("icon"),
        cases = mapOf(
            "club" to const("icon-club"),
            "missing" to const("icon-missing"),
        ),
        default = const("icon-default"),
    ),
)
```

### `RasterLayer`

For raster sources (not typically needed when using a full Stadia style, since the style JSON already declares raster sources/layers):

```kotlin
RasterSource(id = "satellite", tiles = listOf("https://example/{z}/{x}/{y}.png"))
RasterLayer(id = "satellite", source = "satellite")
```

## Layer ordering

Layers render in declaration order inside the `MaplibreMap { ... }` block. Anchor relative to an existing style layer via `aboveLayer` / `belowLayer`:

```kotlin
FillLayer(
    id = "field-boundaries-fill",
    source = "field-boundaries",
    fillColor = const(Color(0xFF4CAF50)),
    belowLayer = "place-city",
)
```

Typical pattern for Stadia styles: fills below labels, symbols above everything.

## End-to-end example

Mirror of the iOS `MapView { ShapeSource { } LineStyleLayer { } }` pattern:

```kotlin
@Composable
fun FieldsMap(
    styleUrl: String,
    fields: List<Field>,
    onFieldTap: (fieldId: String) -> Unit,
) {
    val camera = rememberCameraState(
        firstPosition = CameraPosition(target = LatLng(42.85, -88.13), zoom = 14.0),
    )
    val features = remember(fields) { fields.toFeatureCollection() }

    MaplibreMap(
        styleUrl = styleUrl,
        cameraState = camera,
        modifier = Modifier.fillMaxSize(),
        onMapClick = { latLng, screenPoint ->
            camera.queryRenderedFeatures(screenPoint, listOf("field-boundaries-fill"))
                .firstOrNull()
                ?.getStringProperty("id")
                ?.let(onFieldTap)
            true
        },
    ) {
        GeoJsonSource(id = "field-boundaries", data = features)

        FillLayer(
            id = "field-boundaries-fill",
            source = "field-boundaries",
            fillColor = const(Color(0xFF4CAF50)),
            fillOpacity = const(0.25f),
        )

        LineLayer(
            id = "field-boundaries-line",
            source = "field-boundaries",
            lineColor = const(Color.White),
            lineWidth = interpolate(
                type = InterpolateType.Exponential(1.5),
                input = zoom(),
                stops = listOf(14.0 to 1.5, 18.0 to 4.0),
            ),
        )
    }
}
```

## Gestures

Tap + long press are exposed as top-level `MaplibreMap` parameters:

```kotlin
MaplibreMap(
    styleUrl = styleUrl,
    cameraState = camera,
    onMapClick = { latLng, screenPoint ->
        val features = camera.queryRenderedFeatures(
            screenPoint = screenPoint,
            layerIds = listOf("field-boundaries-fill"),
        )
        features.firstOrNull() != null
    },
    onMapLongClick = { latLng, _ ->
        onCreateFarmAt(latLng)
        true
    },
) { /* ... */ }
```

Return `true` to consume the gesture (prevents the map from handling it further); `false` to let it propagate.

## User location

Enable via the map settings / `LocationComponent` options. The DSL exposes a `locationEngineEnabled` flag; lower-level config still goes through the raw `MapLibreMap` inside `onStyleLoaded`:

```kotlin
MaplibreMap(
    styleUrl = styleUrl,
    cameraState = camera,
    onStyleLoaded = { style ->
        mapLibreMap.locationComponent.activateLocationComponent(
            LocationComponentActivationOptions.builder(context, style)
                .useDefaultLocationEngine(true)
                .build(),
        )
        mapLibreMap.locationComponent.isLocationComponentEnabled = true
        mapLibreMap.locationComponent.cameraMode = CameraMode.TRACKING
    },
) { /* ... */ }
```

See `maplibre-native-android.md` for the full `LocationComponent` surface.

## Bridging to Compose state

Observe camera position changes via `snapshotFlow`:

```kotlin
LaunchedEffect(camera) {
    snapshotFlow { camera.position }
        .collect { position ->
            viewModel.onCameraMoved(position)
        }
}
```

Swap style URL at runtime — just change the `styleUrl` parameter; the DSL rebuilds sources/layers against the new style automatically.

## Common pitfalls

- **Identifier collisions.** Two `GeoJsonSource`s or layers with the same `id` silently overwrite. Prefix by feature (`field-`, `farm-`, `tract-`).
- **Unremembered `FeatureCollection`.** Building GeoJSON inside the Composable body without `remember` reuploads on every recomposition and causes visible flicker.
- **Camera constructed inline.** Always use `rememberCameraState(...)`, never a fresh `CameraState()` on each composition.
- **Feature property types.** `addStringProperty` / `addNumberProperty` / `addBooleanProperty` must match how you reference them in expressions (`feature("name")` for string, `toNumber(feature("count"))` for numeric).
- **Registering icons before use.** `SymbolLayer` with `iconImage = const("pin")` requires the image be added to the style (via `style.addImage("pin", drawable)`) before first render, otherwise the layer draws nothing and logs a warning.
- **DSL is a Composable block, not a result builder.** Standard Compose rules apply — conditionals / loops are fine, but state reads inside the block trigger recomposition of the map contents.
