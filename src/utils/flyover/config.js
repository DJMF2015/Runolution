export const FLYOVER_SPEEDS = [0.5, 1, 1.5, 2, 2.5, 3.0, 3.5, 4.0, 4.5];
export const FLYOVER_INTRO_DURATION_MS = 2500;
export const FLYOVER_OUTRO_DURATION_MS = 3600;
export const FLYOVER_ZOOM = 13.25;
export const FLYOVER_PITCH = 58;
export const FLYOVER_OUTRO_PITCH = 38;
export const FLYOVER_INTRO_START_ALTITUDE = 2800000;
export const FLYOVER_TILE_WAIT_MS = 1800;
export const ACTIVITY_ROUTE_SOURCE_ID = 'linepath';
export const ACTIVITY_ROUTE_LAYER_ID = 'line-dashed';
export const DEFAULT_FLYOVER_ROUTE_GRADIENT = '#fb0707';
export const FLYOVER_ROUTE_GRADIENT = '#e1ff00';

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const METRES_PER_KM = 1000;
export const SECONDS_PER_MINUTE = 60;
export const SMOOTHING_SAMPLE_COUNT = 9;
export const CAMERA_TARGET_SMOOTHING_RATIO = 0.018;
export const MIN_CAMERA_TARGET_SMOOTHING_KM = 0.08;
export const MAX_CAMERA_TARGET_SMOOTHING_KM = 0.45;
export const SAME_DIRECTION_BEARING_THRESHOLD = 15;
export const DRAMATIC_BEARING_CHANGE_THRESHOLD = 45;
export const DRAMATIC_TURN_DAMPING = 0.4;
export const NORMAL_TURN_RATE = 0.015;
export const DRAMATIC_TURN_RATE = 0.095;
export const CAMERA_CENTER_SMOOTHING = 0.075;
export const FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING = 0.18;
export const CAMERA_MARKER_LEAD_RATIO = 0.16;
export const CAMERA_DRAMATIC_TURN_LEAD_RATIO = 0.05;
export const CAMERA_HIGH_SPEED_LEAD_RATIO = 0.08;
export const FLYOVER_HIGH_SPEED_THRESHOLD = 3;
export const CAMERA_MAX_TURN_LEAD_DEGREES = 90;
export const LOOPING_ROUTE_BEARING_THRESHOLD = 105;
export const LOOPING_ROUTE_MACRO_LOOKAHEAD_RATIO = 0.22;
export const MIN_LOOPING_ROUTE_MACRO_LOOKAHEAD_KM = 0.7;
export const MAX_LOOPING_ROUTE_MACRO_LOOKAHEAD_KM = 3.2;
export const LOOPING_ROUTE_MACRO_BEARING_WEIGHT = 0.72;
export const SMALL_LOOP_DETECTION_DISTANCE_KM = 1.6;
export const SMALL_LOOP_MAX_DIAMETER_KM = 0.65;
export const SMALL_LOOP_MIN_PATH_TO_DIAMETER_RATIO = 2.4;
export const SMALL_LOOP_MIN_BEARING_SPREAD_DEGREES = 150;
export const FLYOVER_ZOOM_LIMITS = {
  min: 12.4,
  max: 17,
};
export const FLYOVER_ALTITUDE_LIMITS = {
  min: 650,
  max: 5200,
};
export const FLYOVER_HIGH_ROUTE_ALTITUDE_METRES = 2000;
export const FLYOVER_HIGH_ROUTE_ALTITUDE_RAMP_METRES = 1500;
export const FLYOVER_HIGH_ROUTE_CLEARANCE_METRES = 1800;
export const FLYOVER_HIGH_ROUTE_MAX_CAMERA_ALTITUDE = 7600;
export const FLYOVER_HIGH_ROUTE_MAX_ZOOM_OUT = 0.75;
export const ROUTE_DISTANCE_ZOOM_STOPS = [
  { thresholdKm: 1, value: 16.6 },
  { thresholdKm: 3, value: 16.1 },
  { thresholdKm: 5, value: 15.45 },
  { thresholdKm: 10, value: 14.75 },
  { thresholdKm: 15, value: 14.15 },
  { thresholdKm: 25, value: 13.8 },
  { thresholdKm: 42, value: 13.45 },
];
export const ROUTE_DISTANCE_ALTITUDE_STOPS = [
  { thresholdKm: 1, value: 650 },
  { thresholdKm: 3, value: 850 },
  { thresholdKm: 5, value: 1100 },
  { thresholdKm: 10, value: 1450 },
  { thresholdKm: 15, value: 1750 },
  { thresholdKm: 25, value: 2400 },
  { thresholdKm: 42, value: 3300 },
];
export const RESPONSIVE_CAMERA_ADJUSTMENTS = [
  { maxWidth: 480, zoom: -0.8, altitude: 900 },
  { maxWidth: 768, zoom: -0.5, altitude: 600 },
  { maxWidth: 1024, zoom: -0.25, altitude: 350 },
];
export const ELEVATION_CAMERA_ADJUSTMENTS = [
  { minGainPerKm: 45, zoom: -0.45, altitude: 900 },
  { minGainPerKm: 30, zoom: -0.3, altitude: 600 },
  { minGainPerKm: 15, zoom: -0.15, altitude: 300 },
];
