import {
  FLYOVER_PITCH,
  getFlyoverAltitude,
  getFlyoverZoom,
  formatFlyoverStreamAveragePace,
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
});
