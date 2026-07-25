import * as turf from '@turf/turf';
import {
  FLYOVER_PITCH,
  FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_PULLBACK_METRES,
  FLYOVER_INTRO_PULLBACK_PITCH,
  FLYOVER_INTRO_ROTATION_DEGREES,
  FLYOVER_OUTRO_BEARING,
  detectSmallLoopSection,
  formatFlyoverLiveStreamMetric,
  getDroneBaseZoom,
  getFlyoverAltitude,
  getFlyoverZoom,
  formatFlyoverStreamAveragePace,
  getFlyoverRouteGradient,
  getFlyoverRouteDistanceKm,
  getPreparedFlyoverRouteLine,
  getFlyoverCameraState,
  getStableBearing,
  smoothBearing,
} from '../src/utils/flyover';

const setViewportWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
};

describe('flyover camera framing', () => {
  beforeEach(() => {
    setViewportWidth(1280);
  });

  test('uses the configured cinematic pitch', () => {
    expect(FLYOVER_PITCH).toBe(58);
  });

  test('returns the flyover outro to north-facing orientation', () => {
    expect(FLYOVER_OUTRO_BEARING).toBe(0);
  });

  test('keeps the flyover intro near the route rather than at globe altitude', () => {
    expect(FLYOVER_INTRO_PULLBACK_METRES).toBeLessThan(3000);
    expect(FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE).toBeGreaterThanOrEqual(1000);
    expect(FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE).toBeLessThan(5000);
    expect(FLYOVER_INTRO_PULLBACK_PITCH).toBe(0);
    expect(FLYOVER_INTRO_ROTATION_DEGREES).toBeLessThanOrEqual(90);
  });

  test('uses monotonic distance stops for route framing', () => {
    expect(getFlyoverZoom({ routeDistanceKm: 2 })).toBe(16.4);
    expect(getFlyoverZoom({ routeDistanceKm: 4 })).toBe(15.9);
    expect(getFlyoverZoom({ routeDistanceKm: 9 })).toBe(13.9);
    expect(getFlyoverZoom({ routeDistanceKm: 16.9 })).toBe(13.4);
    expect(getFlyoverZoom({ routeDistanceKm: 30 })).toBe(13.1);

    expect(getFlyoverAltitude({ routeDistanceKm: 2 })).toBe(210);
    expect(getFlyoverAltitude({ routeDistanceKm: 4 })).toBe(240);
    expect(getFlyoverAltitude({ routeDistanceKm: 5 })).toBe(240);
    expect(getFlyoverAltitude({ routeDistanceKm: 9 })).toBe(520);
    expect(getFlyoverAltitude({ routeDistanceKm: 16.9 })).toBe(710);
    expect(getFlyoverAltitude({ routeDistanceKm: 30 })).toBe(1040);
  });

  test('sets drone base zoom from route distance and climbing density', () => {
    expect(
      getDroneBaseZoom({
        routeDistanceKm: 4,
        totalElevationGain: 20,
      }),
    ).toBe(17);
    expect(
      getDroneBaseZoom({
        routeDistanceKm: 25,
        totalElevationGain: 250,
      }),
    ).toBe(15.5);
    expect(
      getDroneBaseZoom({
        routeDistanceKm: 25,
        totalElevationGain: 1200,
      }),
    ).toBeLessThan(15.5);
  });

  test('keeps sub-10km routes close to the linestring marker', () => {
    expect(getFlyoverAltitude({ routeDistanceKm: 0.8 })).toBe(180);
    expect(getFlyoverAltitude({ routeDistanceKm: 5 })).toBe(240);
    expect(getFlyoverAltitude({ routeDistanceKm: 6 })).toBe(520);
    expect(getFlyoverAltitude({ routeDistanceKm: 16 })).toBe(550);
  });

  test('keeps high-altitude routes farther out so the marker remains visible', () => {
    const normalFrame = {
      altitude: getFlyoverAltitude({
        routeDistanceKm: 18,
        streams: {
          altitude: [120, 160, 140],
        },
      }),
      zoom: getFlyoverZoom({
        routeDistanceKm: 18,
        streams: {
          altitude: [120, 160, 140],
        },
      }),
    };
    const highAltitudeStreams = {
      altitude: [2100, 2600, 2400],
    };
    const highAltitudeFrame = {
      altitude: getFlyoverAltitude({
        routeDistanceKm: 18,
        streams: highAltitudeStreams,
      }),
      zoom: getFlyoverZoom({
        routeDistanceKm: 18,
        streams: highAltitudeStreams,
      }),
    };

    expect(highAltitudeFrame.altitude).toBeGreaterThanOrEqual(3050);
    expect(highAltitudeFrame.altitude).toBeGreaterThan(normalFrame.altitude);
    expect(highAltitudeFrame.zoom).toBeLessThan(normalFrame.zoom);
  });

  test('allows extra camera clearance above very high mountain routes', () => {
    const altitude = getFlyoverAltitude({
      routeDistanceKm: 18,
      streams: {
        altitude: [3200, 4100, 3700],
      },
    });

    expect(altitude).toBeGreaterThan(2200);
    expect(altitude).toBeLessThanOrEqual(3200);
  });

  test('formats average pace from stream distance and time at the current flyover point', () => {
    const pace = formatFlyoverStreamAveragePace({
      distanceKm: 2,
      fallbackDistanceMetres: 5000,
      fallbackMovingTimeSeconds: 1500,
      streams: {
        distance: [0, 1000, 2000, 3000],
        time: [0, 300, 660, 1080],
      },
    });

    expect(pace).toBe('5:30 /km');
  });

  test('formats live running pace from velocity stream at the current flyover point', () => {
    const metric = formatFlyoverLiveStreamMetric({
      distanceKm: 1.5,
      fallbackDistanceMetres: 3000,
      fallbackMovingTimeSeconds: 900,
      streams: {
        distance: [0, 1000, 2000],
        velocity_smooth: [3, 4, 5],
      },
    });

    expect(metric).toEqual({
      label: 'Pace',
      value: '3:42 /km',
    });
  });

  test('formats live cycling speed from velocity stream at the current flyover point', () => {
    const metric = formatFlyoverLiveStreamMetric({
      distanceKm: 1,
      fallbackDistanceMetres: 3000,
      fallbackMovingTimeSeconds: 600,
      showSpeed: true,
      streams: {
        distance: [0, 1000, 2000],
        velocity_smooth: [7, 8, 9],
      },
    });

    expect(metric).toEqual({
      label: 'Speed',
      value: '28.8 km/h',
    });
  });

  test('uses static red route color and map-specific flyover route colors', () => {
    expect(getFlyoverRouteGradient()).toBe('#fb0707');
    expect(getFlyoverRouteGradient('street')).toBe('#ff0000');
    expect(getFlyoverRouteGradient('satellite')).toBe('#e1ff00');
  });

  test('smooths bearing changes without snapping to large turns', () => {
    const smallTurn = smoothBearing(0, 8);
    const sharpTurn = smoothBearing(0, 160);

    expect(smallTurn).toBe(0.44000000000005457);
    expect(sharpTurn).toBeCloseTo(1.8);
  });

  test('locks bearing while the route is repeatedly looping in a compact area', () => {
    const lockedBearing = getStableBearing({
      previousBearing: 30,
      targetBearing: 160,
      isLooping: true,
    });
    const resumedBearing = getStableBearing({
      previousBearing: 30,
      targetBearing: 90,
      isLooping: false,
    });

    expect(lockedBearing).toBe(30);
    expect(resumedBearing).toBeGreaterThan(30);
    expect(resumedBearing).toBeLessThan(90);
  });

  test('builds camera state from runner position, center smoothing, and stable bearing', () => {
    const routeLine = turf.lineString([
      [-0.14, 51.5],
      [-0.13, 51.505],
      [-0.12, 51.51],
    ]);
    const routeDistanceKm = turf.length(routeLine, { units: 'kilometers' });
    const distanceKm = routeDistanceKm / 2;
    const previousCameraPosition = [-0.2, 51.45];
    const previousBearing = 42;
    const cameraState = getFlyoverCameraState({
      routeLine,
      distanceKm,
      routeDistanceKm,
      previousCameraPosition,
      previousBearing,
      isLooping: true,
    });
    const expectedRunnerPosition = turf.along(routeLine, distanceKm, {
      units: 'kilometers',
    }).geometry.coordinates;

    expect(cameraState.runnerPosition[0]).toBeCloseTo(expectedRunnerPosition[0]);
    expect(cameraState.runnerPosition[1]).toBeCloseTo(expectedRunnerPosition[1]);
    expect(cameraState.cameraPosition[0]).toBeGreaterThan(previousCameraPosition[0]);
    expect(cameraState.cameraPosition[1]).toBeGreaterThan(previousCameraPosition[1]);
    expect(cameraState.bearing).toBe(previousBearing);
  });

  test('detects repeated compact route loops without flagging open routes', () => {
    const loopCoordinates = turf.circle([-0.1276, 51.5072], 0.08, {
      steps: 24,
      units: 'kilometers',
    }).geometry.coordinates[0];
    const repeatedLoopLine = turf.lineString([
      ...loopCoordinates,
      ...loopCoordinates.slice(1),
      ...loopCoordinates.slice(1),
      ...loopCoordinates.slice(1),
    ]);
    const repeatedLoopDistanceKm = turf.length(repeatedLoopLine, {
      units: 'kilometers',
    });
    const openRouteLine = turf.lineString([
      [-0.14, 51.5],
      [-0.13, 51.505],
      [-0.12, 51.51],
      [-0.11, 51.515],
      [-0.1, 51.52],
    ]);
    const openRouteDistanceKm = turf.length(openRouteLine, { units: 'kilometers' });

    expect(
      detectSmallLoopSection({
        routeLine: repeatedLoopLine,
        distanceKm: repeatedLoopDistanceKm,
        routeDistanceKm: repeatedLoopDistanceKm,
      }),
    ).toBe(true);
    expect(
      detectSmallLoopSection({
        routeLine: openRouteLine,
        distanceKm: openRouteDistanceKm,
        routeDistanceKm: openRouteDistanceKm,
      }),
    ).toBe(false);
  });

  test('detects compact sharp-corner routes before the camera spins around the full loop', () => {
    const start = [-0.1276, 51.5072];
    const sideLengthKm = 0.4;
    const east = turf.destination(start, sideLengthKm, 90, {
      units: 'kilometers',
    }).geometry.coordinates;
    const north = turf.destination(east, sideLengthKm, 0, {
      units: 'kilometers',
    }).geometry.coordinates;
    const west = turf.destination(north, sideLengthKm, 270, {
      units: 'kilometers',
    }).geometry.coordinates;
    const squareRouteLine = turf.lineString([start, east, north, west, start]);
    const squareRouteDistanceKm = turf.length(squareRouteLine, {
      units: 'kilometers',
    });

    expect(
      detectSmallLoopSection({
        routeLine: squareRouteLine,
        distanceKm: squareRouteDistanceKm * 0.25,
        routeDistanceKm: squareRouteDistanceKm,
      }),
    ).toBe(true);
  });

  test('detects repeated tight athletics-track loops under 500 metres', () => {
    const lapCoordinates = turf.circle([-0.1276, 51.5072], 0.064, {
      steps: 32,
      units: 'kilometers',
    }).geometry.coordinates[0];
    const trackRouteLine = turf.lineString([
      ...lapCoordinates,
      ...lapCoordinates.slice(1),
      ...lapCoordinates.slice(1),
    ]);
    const trackRouteDistanceKm = turf.length(trackRouteLine, {
      units: 'kilometers',
    });

    expect(
      detectSmallLoopSection({
        routeLine: trackRouteLine,
        distanceKm: trackRouteDistanceKm * 0.12,
        routeDistanceKm: trackRouteDistanceKm,
      }),
    ).toBe(true);
  });

  test('prepares dense flyover routes without changing sparse routes', () => {
    const sparseRouteLine = turf.lineString([
      [-0.14, 51.5],
      [-0.13, 51.505],
      [-0.12, 51.51],
    ]);
    const denseRouteCoordinates = Array.from({ length: 1200 }, (_, index) => [
      -0.14 + index * 0.00002,
      51.5 + Math.sin(index / 18) * 0.0004,
    ]);
    const denseRouteLine = turf.lineString(denseRouteCoordinates, {
      streams: { altitude: [1, 2, 3] },
    });
    const preparedDenseRouteLine = getPreparedFlyoverRouteLine(denseRouteLine);

    expect(getPreparedFlyoverRouteLine(sparseRouteLine)).toBe(sparseRouteLine);
    expect(preparedDenseRouteLine.geometry.coordinates.length).toBeLessThan(
      denseRouteCoordinates.length,
    );
    expect(preparedDenseRouteLine.geometry.coordinates.length).toBeLessThanOrEqual(900);
    expect(preparedDenseRouteLine.properties.streams).toEqual({ altitude: [1, 2, 3] });
  });

  test('uses prepared geometry distance instead of original stream distance', () => {
    const denseRouteCoordinates = Array.from({ length: 1200 }, (_, index) => [
      -0.14 + index * 0.00002,
      51.5 + Math.sin(index / 10) * 0.0005,
    ]);
    const denseRouteLine = turf.lineString(denseRouteCoordinates, {
      streams: {
        altitude: [1, 2, 3],
        distance: [0, 50000],
      },
    });
    const preparedDenseRouteLine = getPreparedFlyoverRouteLine(denseRouteLine);
    const preparedGeometryDistanceKm = turf.length(preparedDenseRouteLine, {
      units: 'kilometers',
    });

    expect(preparedDenseRouteLine.properties.streams.distance).toBeUndefined();
    expect(getFlyoverRouteDistanceKm(preparedDenseRouteLine)).toBeCloseTo(
      preparedGeometryDistanceKm,
    );
  });
});
