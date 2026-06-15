# Flyover Animation Internals

This document explains how the activity flyover animation works under the hood. It is intended for developers who need to tune the flyover camera, route progress, smoothing, or stream-based route data without having to rediscover the geometry and animation decisions from the code.

## Module Overview

The flyover implementation is split across these files:

- `src/hooks/useFlyoverAnimation.js`
  - Owns React state, animation frames, Mapbox side effects, marker lifecycle, and summary modal state.
- `src/utils/flyOverHelper.js`
  - Compatibility barrel export. Existing imports use this path, but the implementation now lives under `src/utils/flyover/`.
- `src/utils/flyover/index.js`
  - Core camera, route progress, smoothing, bearing, and Mapbox route paint helpers.
- `src/utils/flyover/config.js`
  - Tuning constants for speed, duration, camera zoom, camera altitude, pitch, smoothing, route colors, and Mapbox source/layer IDs.
- `src/utils/flyover/routeData.js`
  - Converts Strava activity streams into dense GeoJSON routes and calculates route distance.
- `src/utils/flyover/formatters.js`
  - Formats distance, pace, and elevation labels for the flyover UI.
- `src/utils/flyover/marker.js`
  - Creates the Mapbox marker element used during flyover playback.

## High-Level Flow

The flyover starts from `useFlyoverAnimation.startFlyover()`.

1. The hook checks that a Mapbox map, route line, route distance, and at least two coordinates exist.
2. Existing flyover state is reset through `stopFlyover()`.
3. The route line color is changed for the active map style.
4. A Mapbox marker is placed on the first route coordinate.
5. Flyover duration, zoom, and altitude are calculated from route distance, screen width, stream data, and elevation gain.
6. The intro animation starts from a very high altitude and eases down toward the route.
7. Once intro is complete, the code waits briefly for Mapbox tiles to load.
8. The animation frame loop advances route progress, marker position, route progress line, camera center, and camera bearing.
9. At the end, the full route line is restored and the summary modal is shown.

The hook deliberately handles orchestration only. Geometry, camera target calculation, easing, and smoothing live in the flyover helper modules.

## Route Data

The flyover prefers dense Strava activity streams over the summary polyline.

`getFlyoverRouteFeatureFromStreams(streams)` reads the `latlng` stream and converts `[lat, lng]` pairs into Mapbox/Turf `[lng, lat]` coordinates. It also preserves stream arrays such as:

- `distance`
- `altitude`
- `time`
- `velocity_smooth`
- `moving`
- `grade_smooth`

Those streams are stored in the GeoJSON feature properties. The route geometry then has richer data than a summary polyline, which makes the marker movement and route progress smoother.

Duplicate adjacent coordinates are skipped. That avoids zero-length segments, which can make bearing calculations unstable.

`getFlyoverRouteDistanceKm(routeLine)` prefers the distance stream when it is consistent with the geometry length. It compares stream distance against Turf geometry distance and only trusts the stream if the ratio is within a sensible range. Otherwise, it falls back to Turf length.

## Route Progress

The flyover does not redraw the entire route on every frame. Instead, it creates a partial route feature from the start of the activity to the current animation distance.

`getFlyoverRouteProgressFeature(routeLine, distanceKm, routeDistanceKm)` does this using Turf:

- clamps the current distance to the route length
- slices the route from `0` to the current distance
- adds the exact current coordinate when Turf's slice does not include it
- returns a LineString with the original route properties preserved

`setFlyoverRouteProgress()` then updates the shared Mapbox route source with that partial line.

## Camera Distance, Zoom, and Altitude

Camera zoom and altitude are calculated separately but follow the same adjustment pipeline:

1. Start with a route-distance base value.
2. Apply a responsive adjustment for smaller screens.
3. Apply an elevation adjustment for hillier routes.
4. Clamp the result to configured min/max limits.

This happens in `getAdjustedCameraValue()`, which is used by both:

- `getFlyoverZoom()`
- `getFlyoverAltitude()`

The reason for the shared adjustment pipeline is that zoom and altitude solve similar framing problems. Longer routes need a wider view, smaller screens need more breathing room, and hilly terrain can feel visually tighter because camera pitch and terrain exaggeration reduce the visible forward area.

## Free Camera Position

`useFlyoverAnimation` uses `setFlyoverFreeCamera()` to move the Mapbox camera. When free camera APIs are available, it calculates a camera position behind the target and converts it to `mapboxgl.MercatorCoordinate`.

The helper function is:

```js
computeCameraPosition(pitch, bearing, targetPosition, altitude)
```

It calculates longitude and latitude offsets from:

- camera pitch
- camera bearing
- target marker position
- altitude

This gives the effect of the camera following behind and above the marker instead of simply centering the map on it.

If Mapbox free camera is not available, the hook falls back to `map.jumpTo()`.

## Intro Easing

The flyover intro starts high above the globe and descends toward the route. The easing function is:

```js
easeCubicOut(progress)
```

This is a cubic easing curve equivalent to `d3.easeCubicOut`:

```js
1 - Math.pow(1 - progress, 3)
```

This is not a full cubic Bezier implementation with control points. It is a cubic polynomial easing function. It behaves similarly to a Bezier-style ease-out because it starts quickly and slows toward the end.

The easing is necessary because a linear descent from globe height to route height feels mechanical and harsh. The cubic ease-out gives a fast initial fly-in and a softer arrival near the route before playback begins.

## Lerp

`lerp(start, end, ratio)` performs linear interpolation:

```js
start + (end - start) * ratio
```

It is used anywhere a value needs to move gradually between two states:

- intro altitude
- intro pitch
- intro bearing
- camera center smoothing
- bearing smoothing
- longitude/latitude interpolation

The important property is that `ratio` controls how far the current frame moves toward the target. A smaller ratio is smoother but slower to respond. A larger ratio responds faster but can look more abrupt.

## Progress Smoothing

`smoothFlyoverProgress(progress)` applies an ease-in/ease-out curve to the animation's linear progress:

```js
0.5 - Math.cos(progress * Math.PI) / 2
```

This means the marker does not instantly start at full visual speed or stop abruptly at the end. The cosine curve gives a natural ramp-up and ramp-down.

This is separate from the intro easing. The intro controls the initial camera fly-in. Progress smoothing controls the route playback itself.

## Longitude/Latitude Smoothing

`smoothLngLat(currentLngLat, targetLngLat, smoothingRatio)` moves the camera center gradually toward the target:

```js
[
  lerp(currentLngLat[0], targetLngLat[0], smoothingRatio),
  lerp(currentLngLat[1], targetLngLat[1], smoothingRatio),
]
```

This prevents the camera from snapping to each new target point. At high playback speeds, the hook uses a higher smoothing ratio so the camera catches up more quickly and the marker is less likely to drift off screen.

## Bearing Normalisation

Bearings wrap around at 180/-180 degrees. Without normalisation, a small turn from `179` degrees to `-179` degrees can look like a `358` degree turn.

`normalizeBearing(bearing)` maps bearings into the `[-180, 180]` range:

```js
((((bearing + 180) % 360) + 360) % 360) - 180
```

This is essential for smooth camera rotation. It ensures the camera takes the shortest rotation path rather than spinning the long way around.

`getBearingDelta(currentBearing, targetBearing)` uses that normalisation to calculate the shortest signed angle between current and target bearing.

## Bearing Smoothing

`smoothBearing(currentBearing, targetBearing)` dampens camera rotation.

It does three things:

1. Ignores very small changes under `SAME_DIRECTION_BEARING_THRESHOLD`.
2. Detects sharper turns using `DRAMATIC_BEARING_CHANGE_THRESHOLD`.
3. Applies a slower turn rate or damping depending on turn severity.

This is necessary because dense GPS streams contain noisy micro-turns. If the camera followed every small bearing change, it would jitter constantly. If it followed every dramatic turn immediately, the marker could disappear off screen during fast playback.

## Cosine-Weighted Route Samples

Several calculations sample route geometry around the current distance instead of trusting a single point.

`getWeightedRouteSamples(distanceKm, routeDistanceKm, sampleDistanceKm)` builds a small window of samples around the current route position.

Each sample is weighted by `getCosineSampleWeight(sampleIndex)`:

```js
0.5 + 0.5 * Math.cos(offsetRatio * Math.PI)
```

This gives high weight to samples near the center of the window and lower weight to samples near the edges.

The cosine window is necessary because a flat average would make edge samples too influential. That can over-smooth the route and make the camera feel detached from the marker. The cosine weighting keeps the current position dominant while still using nearby route shape to reduce jitter.

## Smoothed Route Points

`getSmoothedPointOnRoute(routeLine, distanceKm, routeDistanceKm)` uses weighted route samples to calculate an averaged longitude/latitude.

It:

- samples nearby route distances
- gets each sample coordinate using Turf
- multiplies longitude and latitude by the cosine weight
- divides by total weight

This reduces noise in the camera target when the stream data contains minor GPS wobble.

## Weighted Bearing Mean

Bearings cannot be averaged with ordinary arithmetic because angles wrap.

For example, the average of `179` and `-179` should be close to `180`, not `0`.

`getWeightedBearingMean(bearingSamples)` converts each bearing into a vector:

- `x = cos(radians) * weight`
- `y = sin(radians) * weight`

Then it sums the vectors and converts the result back into a bearing with `atan2`.

This is necessary for stable camera rotation near the wrap boundary and for blending multiple bearing influences safely.

## Local Bearing and Macro Bearing

The flyover uses more than one bearing:

- `targetBearing`: direction from current point to forward focus point
- `routeBearing`: smoothed route direction near the current point
- `macroBearing`: broader route direction over a larger lookahead window

`getFlyoverCameraTarget()` first blends target and route bearing into a local bearing. Then it compares local bearing to macro bearing.

If the local bearing diverges sharply from macro bearing, `getLoopStableBearing()` biases the camera toward the macro bearing.

This matters for repeated laps or circular sections. Without this guard, a route that circles the same area can make the camera spin continuously. The macro bearing keeps the camera aligned with the broader route flow while still preserving some local movement.

## Camera Lead Ratio

`getCameraLeadRatio(turnDelta, flyoverSpeed)` controls how far ahead of the marker the camera target should look.

Normal playback allows more forward lead. Dramatic turns and high-speed playback reduce the lead.

This is necessary because looking too far ahead during a sharp turn can pull the camera target around the bend before the marker gets there. That is one of the ways the marker can drift off screen. Reducing the lead keeps the camera closer to the marker during difficult turns.

## Map Style Route Paint

`getFlyoverRouteGradient(mapStyle)` selects the line color:

- satellite: `#e1ff00`
- street/outdoors/default: `#fb0707`

`setFlyoverRouteGradient()` applies that color to the shared activity route layer. The default red is restored when flyover is not actively using the satellite-specific color.

## Tile Loading and Prefetch

Before playback, the hook calls `setFlyoverTilePrefetch(map)` where Mapbox supports it. This increases tile prefetching so the camera is less likely to outrun rendered map tiles.

After the intro, `waitForFlyoverTiles(map)` waits for Mapbox `idle` or a timeout. This gives satellite and terrain tiles a chance to render before the marker starts moving across the route.

## Summary

The flyover animation is built from several cooperating pieces:

- dense stream coordinates for smoother route geometry
- Turf route slicing for progress rendering
- Mapbox free camera for cinematic following
- cubic ease-out for intro descent
- cosine progress easing for route playback
- lerp for frame-to-frame interpolation
- bearing normalisation to avoid wraparound spins
- cosine-weighted route samples to reduce GPS noise
- vector-based weighted bearing means to average angles correctly
- macro-bearing blending to avoid constant camera spinning on lap routes

The result is a flyover that follows the activity route closely enough to feel accurate, but smooths enough geometry and camera state to avoid jitter, abrupt turns, and disorienting rotation.
