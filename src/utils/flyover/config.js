export const FLYOVER_SPEEDS = [0, 0.5, 1, 1.5, 2, 2.5, 3.0];
export const FLYOVER_INTRO_DURATION_MS = 4200;
export const FLYOVER_OUTRO_DURATION_MS = 3600;
export const FLYOVER_ZOOM = 13.25;
export const FLYOVER_PITCH = 58;
export const FLYOVER_OUTRO_PITCH = 38;
export const FLYOVER_OUTRO_BEARING = 0;
export const FLYOVER_INTRO_PULLBACK_METRES = 2200;
export const FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE = 1800;
export const FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE = 4200;
export const FLYOVER_INTRO_PULLBACK_PITCH = 0;
export const FLYOVER_INTRO_ROTATION_DEGREES = 24;
export const FLYOVER_TILE_WAIT_MS = 1800;
export const FLYOVER_PROGRESS_UPDATE_MS = 50;
export const FLYOVER_MARKER_SIZE_PX = 14;
export const ACTIVITY_ROUTE_SOURCE_ID = 'linepath';
export const ACTIVITY_ROUTE_LAYER_ID = 'line-dashed';
export const DEFAULT_FLYOVER_ROUTE_GRADIENT = '#fb0707';
export const FLYOVER_ROUTE_GRADIENT = '#ff0000';
export const SATELLITE_FLYOVER_ROUTE_GRADIENT = '#e1ff00';

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const METRES_PER_KM = 1000;
export const SECONDS_PER_MINUTE = 60;
export const SMOOTHING_SAMPLE_COUNT = 9;
export const FLYOVER_PREP_MIN_COORDINATES = 450;
export const FLYOVER_PREP_SIMPLIFY_TOLERANCE = 0.000025;
export const FLYOVER_PREP_MAX_COORDINATES = 900;
export const FLYOVER_PREP_CHAIKIN_PASSES = 1;
export const CAMERA_TARGET_SMOOTHING_RATIO = 0.018;
export const MIN_CAMERA_TARGET_SMOOTHING_KM = 0.08;
export const MAX_CAMERA_TARGET_SMOOTHING_KM = 0.45;
export const CAMERA_CENTER_SMOOTHING = 0.075;
export const FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING = 0.18;
export const CAMERA_MARKER_LEAD_RATIO = 0.16;
export const CAMERA_DRAMATIC_TURN_LEAD_RATIO = 0.05;
export const CAMERA_HIGH_SPEED_LEAD_RATIO = 0.08;
export const FLYOVER_HIGH_SPEED_THRESHOLD = 3;
export const CAMERA_MAX_TURN_LEAD_DEGREES = 90;

export const SAME_DIRECTION_BEARING_THRESHOLD = 8;
export const DRAMATIC_BEARING_CHANGE_THRESHOLD = 65;
export const DRAMATIC_TURN_DAMPING = 0.45;
export const NORMAL_TURN_RATE = 0.055;
export const DRAMATIC_TURN_RATE = 0.025;

export const SMALL_LOOP_DETECTION_DISTANCE_KM = 1.9;
export const SMALL_LOOP_MAX_DIAMETER_KM = 0.85;
export const SMALL_LOOP_MIN_PATH_TO_DIAMETER_RATIO = 2.1;
export const SMALL_LOOP_MIN_BEARING_SPREAD_DEGREES = 170;

export const COMPACT_CORNER_MAX_DIAMETER_KM = 0.9;
export const COMPACT_CORNER_MIN_TURN_DEGREES = 55;
export const COMPACT_CORNER_MIN_TURN_COUNT = 3;
export const COMPACT_CORNER_MIN_TOTAL_TURN_DEGREES = 220;

export const TIGHT_LOOP_DETECTION_DISTANCE_KM = 0.85;
export const TIGHT_LOOP_MAX_DIAMETER_KM = 0.55;
export const TIGHT_LOOP_MIN_TOTAL_TURN_DEGREES = 130;

export const FLYOVER_ZOOM_LIMITS = {
  min: 12.4,
  max: 17,
};
export const FLYOVER_ALTITUDE_LIMITS = {
  min: 140,
  max: 2200,
};
export const FLYOVER_HIGH_ROUTE_ALTITUDE_METRES = 900;
export const FLYOVER_HIGH_ROUTE_ALTITUDE_RAMP_METRES = 1600;
export const FLYOVER_HIGH_ROUTE_CLEARANCE_METRES = 550;
export const FLYOVER_HIGH_ROUTE_MAX_CAMERA_ALTITUDE = 3200;
export const FLYOVER_HIGH_ROUTE_MAX_ZOOM_OUT = 0.55;
export const ROUTE_DISTANCE_ZOOM_STOPS = [
  { thresholdKm: 1, value: 16.8 },
  { thresholdKm: 3, value: 16.4 },
  { thresholdKm: 5, value: 15.9 },
  { thresholdKm: 10, value: 13.9 },
  { thresholdKm: 15, value: 13.7 },
  { thresholdKm: 25, value: 13.4 },
  { thresholdKm: 42, value: 13.1 },
];
export const ROUTE_DISTANCE_ALTITUDE_STOPS = [
  { thresholdKm: 1, value: 180 },
  { thresholdKm: 3, value: 210 },
  { thresholdKm: 5, value: 240 },
  { thresholdKm: 5.1, value: 240 },
  { thresholdKm: 10, value: 520 },
  { thresholdKm: 16.1, value: 550 },
  { thresholdKm: 25, value: 710 },
  { thresholdKm: 42, value: 1040 },
];
export const RESPONSIVE_CAMERA_ADJUSTMENTS = [
  { maxWidth: 480, zoom: -0.8, altitude: 120 },
  { maxWidth: 768, zoom: -0.5, altitude: 80 },
  { maxWidth: 1024, zoom: -0.25, altitude: 40 },
];
export const ELEVATION_CAMERA_ADJUSTMENTS = [
  { minGainPerKm: 45, zoom: -0.45, altitude: 450 },
  { minGainPerKm: 30, zoom: -0.3, altitude: 300 },
  { minGainPerKm: 15, zoom: -0.15, altitude: 160 },
];
