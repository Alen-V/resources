# MapLibreSwiftUI DSL

Package: `https://github.com/maplibre/swiftui-dsl`
Modules: `MapLibreSwiftUI`, `MapLibreSwiftDSL` (both required for typical usage)
Underlying: `MapLibre` (raw MLN types are still imported for `MLNPointFeature`, `MLNPolyline`, etc.)

## Minimal MapView

```swift
import MapLibre
import MapLibreSwiftDSL
import MapLibreSwiftUI
import SwiftUI

struct BasicMapView: View {
    let styleURL: URL  // e.g., MapHelpers.styleURL

    var body: some View {
        MapView(
            styleURL: styleURL,
            camera: .constant(.center(
                CLLocationCoordinate2D(latitude: 0, longitude: 0),
                zoom: 14
            ))
        ) {
            // Sources and layers go here (result builder block)
        }
        .ignoresSafeArea(.all)
    }
}
```

## Camera

`MapViewCamera` is the camera state type. Hold it in `@State` and bind it:

```swift
@State private var camera: MapViewCamera = .center(initialCoordinate, zoom: 14)

MapView(styleURL: styleURL, camera: $camera) { … }
```

Factory methods:

- `.center(_ coordinate: CLLocationCoordinate2D, zoom: Double)` — anchor at a coordinate
- `.center(_ coordinate, zoom:, direction:)` — same plus heading rotation
- `.showcase(shapeCollection:, edgePadding:)` — frame an `MLNShapeCollection` with insets
- `.trackUserLocation(zoom:, pitch:)` — follow user, no heading
- `.trackUserLocationWithCourse(zoom:, pitch:)` — follow user, align to heading

Programmatic moves are just state assignments:

```swift
.task {
    try? await Task.sleep(nanoseconds: 1_000_000_000)
    camera = .center(targetCoordinate, zoom: 16)
}
```

Observe style readiness with `.onMapStyleLoaded { _ in … }` before issuing camera moves that depend on layers being present.

**Pitfall:** `camera: .constant(.center(...))` will NOT respond to subsequent state changes. Use a `@State`-backed binding (`$camera`) for any moveable map.

## Sources

### `ShapeSource`

Wraps `MLN*Feature` instances with a result builder:

```swift
let pointSource = ShapeSource(identifier: "points") {
    MLNPointFeature(coordinate: CLLocationCoordinate2D(latitude: 51.47778, longitude: -0.00139))

    MLNPointFeature(coordinate: someCoord) { feature in
        feature.attributes["icon"] = "club"
        feature.attributes["heading"] = 145
    }
}
```

Polylines:

```swift
let polylineSource = ShapeSource(identifier: "polyline") {
    MLNPolylineFeature(coordinates: waypoints)
}
```

Clustering:

```swift
ShapeSource(identifier: "points", options: [.clustered: true, .clusterRadius: 44]) {
    MLNPointFeature(coordinate: ...)
    // ...
}
```

**Pitfall:** Module-level `let pointSource = ShapeSource(...)` must be `@MainActor`-isolated. Either declare it `@MainActor` or build the source inside the view body.

## Layer types

### `BackgroundLayer`

```swift
BackgroundLayer(identifier: "rose-tint")
    .backgroundColor(.systemPink.withAlphaComponent(0.3))
    .renderAbove(.all)
```

### `CircleStyleLayer`

```swift
CircleStyleLayer(identifier: "simple-circles", source: pointSource)
    .radius(16)
    .color(.systemRed)
    .strokeWidth(2)
    .strokeColor(.white)
    .predicate(NSPredicate(format: "cluster != YES"))
```

### `SymbolStyleLayer`

```swift
SymbolStyleLayer(identifier: "simple-symbols", source: pointSource)
    .iconImage(UIImage(systemName: "mappin")!.withRenderingMode(.alwaysTemplate))
    .iconColor(.white)
    .iconRotation(45)                                // constant rotation
    .iconRotation(featurePropertyNamed: "heading")   // dynamic from attribute
    .text(expression: NSExpression(format: "CAST(point_count, 'NSString')"))
    .textColor(.white)
```

Multi-image symbols (icon picked per feature attribute):

```swift
SymbolStyleLayer(identifier: "icons", source: pointSource)
    .iconImage(
        featurePropertyNamed: "icon",
        mappings: [
            "missing": UIImage(systemName: "mappin.slash")!,
            "club": UIImage(systemName: "figure.dance")!,
        ],
        default: UIImage(systemName: "mappin")!
    )
```

**Note:** the multi-image form has historically misbehaved in Swift Package previews — works fine in real app targets.

### `LineStyleLayer`

Casing + inner pattern (common for routes / drawn polylines):

```swift
LineStyleLayer(identifier: "polyline-casing", source: polylineSource)
    .lineCap(.round)
    .lineJoin(.round)
    .lineColor(.white)
    .lineWidth(
        interpolatedBy: .zoomLevel,
        curveType: .exponential,
        parameters: NSExpression(forConstantValue: 1.5),
        stops: NSExpression(forConstantValue: [14: 6, 18: 24])
    )
    .renderBelow(.symbols)

LineStyleLayer(identifier: "polyline-inner", source: polylineSource)
    .lineDashPattern([2.0, 0.5])
    .lineCap(.butt)
    .lineColor(.systemBlue)
    .lineWidth(
        interpolatedBy: .zoomLevel,
        curveType: .exponential,
        parameters: NSExpression(forConstantValue: 1.5),
        stops: NSExpression(forConstantValue: [14: 3, 18: 16])
    )
    .renderBelow(.symbols)
```

### `FillStyleLayer`

Used for polygon fills (e.g., field boundaries). Modifier names follow the same shape as `LineStyleLayer`. Pair with a thin `LineStyleLayer` on the same source for an outlined fill effect.

## Layer ordering

- `.renderAbove(.all)` — top of the stack
- `.renderBelow(.symbols)` — below the style's labels (typical for polylines / fills so labels stay readable)
- `.renderBelow("some-existing-layer-id")` — anchor relative to a known style layer

## Gestures

Tap on specific layer ids — receives the features at that screen point on the listed layers:

```swift
MapView(styleURL: styleURL, camera: $camera) { … }
    .onTapMapGesture(on: ["simple-circles-non-clusters"], onTapChanged: { _, features in
        // features: [MLNFeature]
        print("Tapped: \(features.first?.debugDescription ?? "<nil>")")
    })
```

Cluster expand-on-tap:

```swift
.mapClustersExpandOnTapping(clusteredLayers: [
    ClusterLayer(layerIdentifier: "simple-circles-clusters", sourceIdentifier: "points")
])
```

## User location styling

```swift
MapView(...)
    .mapContentInset(.init(top: 450, left: 0, bottom: 0, right: 0))
    .mapControls { LogoView() }
```

`MapUserAnnotationStyle` configures the puck appearance — halo color/width, fill, shadow — when using a `.trackUserLocation*` camera mode.

## Escape hatch — raw MLN access

When the DSL doesn't expose what you need:

```swift
MapView(...) { … }
    .unsafeMapViewControllerModifier { vc in
        vc.mapView.showsUserLocation = true
        vc.mapView.minimumZoomLevel = 4
        vc.mapView.maximumZoomLevel = 19
    }
```

`vc.mapView` is the raw `MLNMapView`. Use this only for what the DSL genuinely doesn't cover — most styling, sources, layers, and gestures already have DSL equivalents.

## Common pitfalls

- **Identifier collisions.** Two `ShapeSource`s or layers with the same `identifier` silently overwrite each other.
- **Constant cameras don't update.** Use `$camera` binding for any view where the camera should respond to state.
- **`@MainActor` on module-level sources.** Required if you declare `let source = ShapeSource(...)` at file scope.
- **Result builder vs control flow.** The `MapView { ... }` block is a result builder — only patterns supported by SwiftUI's builder DSL work (no arbitrary `for` loops, no conditional `var`s).
- **NSExpression syntax is ObjC-flavored.** Even though the DSL wraps it, the expressions still use `NSExpression(forConstantValue:)`, `NSPredicate(format: "cluster == YES")`, etc.
- **DSL closures are `@ViewBuilder`-like, not actor-isolated.** Long-running work belongs outside the builder block.
