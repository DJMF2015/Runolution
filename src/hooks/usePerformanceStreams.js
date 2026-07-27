import { useEffect, useMemo, useState } from 'react';
import { getAthleteStreams } from '../utils/functions';
import { fetchTokenInfo, isUnauthorizedError } from '../utils/helpers';
import { summarizeGradeAdjustedEffort } from '../utils/gradeAdjustedEffort';
import {
  getCachedPerformanceMetrics,
  selectBalancedStreamActivities,
  storePerformanceMetric,
} from '../utils/performanceMetrics';

export const usePerformanceStreams = ({
  activities,
  enabled,
  onAuthError,
  referenceDate = new Date(),
}) => {
  const referenceTime = new Date(referenceDate).getTime();
  const selectedActivities = useMemo(
    () =>
      selectBalancedStreamActivities(
        activities,
        new Date(referenceTime),
      ),
    [activities, referenceTime],
  );
  const [metricsByActivity, setMetricsByActivity] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cachedMetrics = getCachedPerformanceMetrics(selectedActivities);

    setMetricsByActivity((currentMetrics) => ({
      ...currentMetrics,
      ...cachedMetrics,
    }));
  }, [selectedActivities]);

  useEffect(() => {
    if (!enabled || !selectedActivities.length) {
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadMetrics = async () => {
      const cachedMetrics = getCachedPerformanceMetrics(selectedActivities);
      const activitiesToLoad = selectedActivities.filter(
        (activity) => !cachedMetrics[activity.id],
      );

      if (!activitiesToLoad.length) {
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const token = await fetchTokenInfo();

      if (!token) {
        setIsLoading(false);
        return;
      }

      let loadedMetricCount = Object.keys(cachedMetrics).length;

      for (const activity of activitiesToLoad) {
        if (cancelled) {
          return;
        }

        try {
          const response = await getAthleteStreams(activity.id, token);
          const metric = summarizeGradeAdjustedEffort(response?.data, activity);

          if (metric) {
            loadedMetricCount += 1;
            storePerformanceMetric(activity.id, metric);
            setMetricsByActivity((currentMetrics) => ({
              ...currentMetrics,
              [activity.id]: metric,
            }));
          }
        } catch (streamError) {
          if (isUnauthorizedError(streamError)) {
            onAuthError?.(streamError);
            break;
          }
        }
      }

      if (!cancelled) {
        setError(
          loadedMetricCount
            ? null
            : 'Grade-related stream data is unavailable for these activities.',
        );
        setIsLoading(false);
      }
    };

    loadMetrics().catch(() => {
      if (!cancelled) {
        setError('Grade-related stream data could not be loaded.');
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, onAuthError, selectedActivities]);

  return {
    error,
    isLoading,
    metricsByActivity,
    sampledActivityCount: selectedActivities.length,
  };
};
