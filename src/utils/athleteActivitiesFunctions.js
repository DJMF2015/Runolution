import { getAthleteActivities, getUsersDetails } from './functions';
import { checkIfTokenExpired, removeDataAfterDuration } from './helpers';

/**
 * Fetches all Strava activities for the athlete, handling pagination
 * @param {string} accessToken - The Strava API access token
 * @returns {Promise<Array>} Array of activity objects
 */
export const fetchStravaActivities = async (accessToken, onLoadingStateChange) => {
  let stravaActivityResponse = [];
  let looper_num = 1;

  while (looper_num || stravaActivityResponse.length === 0) {
    const stravaActivityResponseSingle = await getAthleteActivities(
      accessToken,
      200,
      looper_num,
    );

    if (
      !stravaActivityResponseSingle.data ||
      stravaActivityResponseSingle.data.length === 0 ||
      stravaActivityResponseSingle.data.errors
    ) {
      break;
    } else {
      if (onLoadingStateChange) {
        onLoadingStateChange(stravaActivityResponse.length);
      }
      stravaActivityResponse = stravaActivityResponse.concat(
        stravaActivityResponseSingle.data,
      );
    }
    looper_num++;
  }

  return stravaActivityResponse;
};

/**
 * Fetches athlete activities with caching logic
 * @param {string} accessToken - The Strava API access token
 * @param {Function} setLoading - State setter for loading state
 * @param {Function} setActivityLoadingState - State setter for activity loading progress
 * @returns {Promise<Array>} Array of activities
 */
export const fetchData = async (accessToken, setLoading, setActivityLoadingState) => {
  removeDataAfterDuration('activities', 6);
  const data = JSON.parse(localStorage.getItem('activities'));

  if (data !== null && data !== undefined) {
    setLoading(false);
    return data;
  }

  setLoading(true);
  let stravaActivityResponse = await fetchStravaActivities(accessToken, (count) => {
    setActivityLoadingState(count);
  });

  setLoading(false);
  localStorage.setItem('activities', JSON.stringify(stravaActivityResponse));
  return stravaActivityResponse;
};

/**
 * Fetches and validates token expiration
 * @returns {Promise<void>}
 */
export const fetchTokenInfo = async () => {
  const expires_at = localStorage.getItem('expires_at');
  const expires_in = localStorage.getItem('expires_in');

  if (expires_at && expires_in) {
    return checkIfTokenExpired(expires_in, expires_at);
  }

  return JSON.parse(localStorage.getItem('access_token'));
};

/**
 * Initializes user details
 * @param {string} accessToken - The Strava API access token
 * @returns {Promise<void>}
 */
export const initializeUserDetails = async (accessToken) => {
  if (accessToken) {
    const response = await getUsersDetails(accessToken);
    return response?.data;
  }

  return null;
};
