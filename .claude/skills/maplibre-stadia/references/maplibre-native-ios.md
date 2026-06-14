# MapLibre Native iOS — Raw API Reference

The DSL covers most needs. This file is for the cases where you have to drop into raw MapLibre Native types — typically inside `.unsafeMapViewControllerModifier { vc in ... }` (where `vc.mapView` is an `MLNMapView`), or when constructing `MLN*Feature` instances inside a `ShapeSource` builder.

## Imports

```swift
import MapLibre   // MLN* types
```

Underlying SPM package (added transitively by `swiftui-dsl`):
`https://github.com/maplibre/maplibre-gl-native-distribution`

## `MLNMapView`

Core map view (UIKit). The DSL wraps it; you can still configure the underlying view via the unsafe modifier:

```swift
.unsafeMapViewControllerModifier { vc in
    let mapView = vc.mapView
    mapView.showsUserLocation = true
    mapView.userTrackingMode = .followWithHeading
    mapView.minimumZoomLevel = 4
    mapView.maximumZoomLevel = 19
    mapView.compassView.compassVisibility = .visible
    mapView.logoView.isHidden = false           // required by Stadia attribution
    mapView.attributionButton.isHidden = false  // required by Stadia attribution
}
```

Common properties:

- `styleURL: URL?` — replace at runtime to swap styles
- `style: MLNStyle?` — populated after `mapViewDidFinishLoadingStyle`
- `camera: MLNMapCamera` / `setCamera(_:animated:)`
- `centerCoordinate: CLLocationCoordinate2D` / `setCenter(_:zoomLevel:animated:)`
- `zoomLevel: Double`, `direction: CLLocationDirection`, `pitch: CGFloat`
- `userLocation: MLNUserLocation?`, `showsUserLocation: Bool`, `userTrackingMode: MLNUserTrackingMode`
- `visibleCoordinateBounds: MLNCoordinateBounds`
- `compassView`, `logoView`, `attributionButton` — leave logo + attribution visible

## Feature types (used inside `ShapeSource`)

- `MLNPointFeature` — single coordinate; `attributes: [String: Any]` for property-driven styling
- `MLNPolylineFeature(coordinates: [CLLocationCoordinate2D])` — open path
- `MLNPolygonFeature(coordinates: ..., count: ..., interiorPolygons: ...)` — filled area, optional holes
- `MLNShapeCollectionFeature(shapes: [MLNShape])` — heterogeneous group
- `MLNPointCollectionFeature` — multipoint

All conform to `MLNFeature` (which extends `MLNAnnotation`). Set `feature.attributes["key"] = value` to expose properties to layer expressions (`featurePropertyNamed:` modifiers).

## Annotations (legacy path — prefer DSL layers)

`MLNPointAnnotation`, `MLNPolyline`, `MLNPolygon` are the pre-DSL annotation API. Avoid for new code; use `ShapeSource` + layers instead. Performance is much better and you get full styling control.

## `MLNMapViewDelegate` callbacks

Set via `vc.mapView.delegate = self` inside the unsafe modifier (or use a coordinator). Most-used callbacks:

| Callback | When it fires |
|---|---|
| `mapView(_:didFinishLoading:)` / `mapViewDidFinishLoadingStyle(_:)` | Style URL fully loaded — safe to add sources/layers programmatically |
| `mapView(_:regionWillChangeAnimated:)` | Camera about to move |
| `mapView(_:regionDidChangeAnimated:)` | Camera settled after pan/zoom |
| `mapView(_:didUpdate:)` | New `MLNUserLocation` arrived |
| `mapView(_:didFailToLocateUserWithError:)` | Location failure |
| `mapView(_:didTapAnnotation:)` | Tap on a legacy annotation |

For tap-on-feature handling, prefer the DSL's `.onTapMapGesture(on:onTapChanged:)` rather than wiring a `UITapGestureRecognizer` to the raw map view.

## Coordinate types

- `CLLocationCoordinate2D(latitude: Double, longitude: Double)` — WGS84 lat/lon. **MapLibre always wants WGS84.**
- `MLNCoordinateBounds(sw:ne:)` — bounding box
- `MLNMapCamera(lookingAtCenter:acrossDistance:pitch:heading:)` — full 3D camera

## Style introspection

After style load you can query layers and sources:

```swift
guard let style = vc.mapView.style else { return }
let label = style.layer(withIdentifier: "place-city")
let myFill = style.source(withIdentifier: "field-boundaries") as? MLNShapeSource
```

For dynamic source updates (e.g., drawing a field boundary in progress), grab the underlying `MLNShapeSource` and reassign its shape:

```swift
shapeSource.shape = MLNShapeCollectionFeature(shapes: features)
```

## When to drop to raw API vs stay in DSL

| Need | Use |
|---|---|
| Static layers, sources, gestures | DSL |
| Feature-driven styling | DSL (with `featurePropertyNamed:`) |
| Camera tracking modes | DSL `MapViewCamera.trackUserLocation*` |
| Mid-frame mutating an existing source | Raw via unsafe modifier |
| `compassView`, `logoView`, `attributionButton` config | Raw |
| `MLNMapViewDelegate` callbacks not exposed by DSL | Raw |
| Style introspection (`MLNStyle.layers`, `.sources`) | Raw |
