import { summarizeGradeAdjustedEffort } from '../src/utils/gradeAdjustedEffort';

const createStreams = ({ grade, heartRate = 140, velocity = 3 }) => ({
  altitude: { data: [100, 100, 108, 116] },
  distance: { data: [0, 100, 200, 300] },
  grade_smooth: { data: grade },
  heartrate: { data: Array(4).fill(heartRate) },
  velocity_smooth: { data: Array(4).fill(velocity) },
  moving: { data: Array(4).fill(true) },
});

test('increases effort and climbing share when stream grade increases', () => {
  const flatMetric = summarizeGradeAdjustedEffort(
    createStreams({ grade: [0, 0, 0, 0] }),
    { sport_type: 'Run' },
  );
  const climbingMetric = summarizeGradeAdjustedEffort(
    createStreams({ grade: [0, 8, 8, 0] }),
    { sport_type: 'Run' },
  );

  expect(climbingMetric.effort).toBeGreaterThan(flatMetric.effort);
  expect(climbingMetric.climbingShare).toBe(50);
  expect(climbingMetric.averageClimbingGrade).toBe(8);
});

test('includes heart rate and pace stream intensity in the effort index', () => {
  const steadyMetric = summarizeGradeAdjustedEffort(
    createStreams({ grade: [0, 8, 8, 0] }),
    { sport_type: 'Run' },
  );
  const intenseMetric = summarizeGradeAdjustedEffort(
    createStreams({ grade: [0, 8, 8, 0], heartRate: 165, velocity: 4 }),
    { sport_type: 'Run' },
  );

  expect(intenseMetric.effort).toBeGreaterThan(steadyMetric.effort);
  expect(intenseMetric.averageHeartRate).toBe(165);
  expect(intenseMetric.averagePace).toBeCloseTo(4.17, 2);
});
