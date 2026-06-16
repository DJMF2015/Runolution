import * as turf from '@turf/turf';
import {
  FLYOVER_PITCH,
  detectSmallLoopSection,
  getFlyoverAltitude,
  getFlyoverZoom,
  formatFlyoverStreamAveragePace,
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

  test('uses monotonic distance stops for route framing', () => {
    expect(getFlyoverZoom({ routeDistanceKm: 2 })).toBe(16.1);
    expect(getFlyoverZoom({ routeDistanceKm: 4 })).toBe(15.45);
    expect(getFlyoverZoom({ routeDistanceKm: 9 })).toBe(14.75);
    expect(getFlyoverZoom({ routeDistanceKm: 16.9 })).toBe(13.8);
    expect(getFlyoverZoom({ routeDistanceKm: 30 })).toBe(13.45);

    expect(getFlyoverAltitude({ routeDistanceKm: 2 })).toBe(850);
    expect(getFlyoverAltitude({ routeDistanceKm: 4 })).toBe(1100);
    expect(getFlyoverAltitude({ routeDistanceKm: 9 })).toBe(1450);
    expect(getFlyoverAltitude({ routeDistanceKm: 16.9 })).toBe(2400);
    expect(getFlyoverAltitude({ routeDistanceKm: 30 })).toBe(3300);
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

    expect(highAltitudeFrame.altitude).toBeGreaterThanOrEqual(4400);
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

    expect(altitude).toBeGreaterThan(5200);
    expect(altitude).toBeLessThanOrEqual(7600);
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

  test('smooths bearing changes without snapping to large turns', () => {
    const smallTurn = smoothBearing(0, 8);
    const sharpTurn = smoothBearing(0, 160);

    expect(smallTurn).toBe(0);
    expect(sharpTurn).toBeCloseTo(6.08);
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
});
