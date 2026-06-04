import axios from 'axios';
import { auth_revoke_link, baseURL } from './config';
import { removeDataAfterDuration } from './helpers';
import { RateLimiter } from './rateLimiter';

const stravaRateLimiter = new RateLimiter(100, 15 * 60 * 1000);

/**
 * Preserves Axios response metadata while standardizing Strava API errors.
 */
const createStravaError = (message, error) => {
  const status = error?.response?.status;
  const stravaError = new Error(message);
  stravaError.status = status;
  stravaError.response = error?.response;
  stravaError.originalError = error;
  return stravaError;
};

/**
 * Fetches all-time athlete stats from Strava for charts and profile metrics.
 *
 * @param {number|string} userId - Strava athlete id.
 * @param {string} accessToken - Valid Strava bearer token.
 * @returns {Promise<import('axios').AxiosResponse>} Axios response from Strava.
 */
export const getAthleteStats = async (userId, accessToken) => {
  if (await stravaRateLimiter.request()) {
    const apiUrl = `${baseURL}/athletes/${userId}/stats`;
    try {
      removeDataAfterDuration('athlete', 6);
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 200) {
        return response;
      } else {
        throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
      }
    } catch (error) {
      throw createStravaError(
        `Error while fetching athlete stats: ${error.message}`,
        error,
      );
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};

/**
 * Fetches one paginated page of the authenticated athlete's activities.
 */
export const getAthleteActivities = async (accessToken, per_page, index) => {
  if (await stravaRateLimiter.request()) {
    const apiUrl = `${baseURL}/athlete/activities?per_page=${per_page}&page=${index}`;
    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 200) {
        return response;
      } else {
      }
      throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
    } catch (error) {
      throw createStravaError(
        `Error while fetching athlete activities: ${error.message}`,
        error,
      );
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};

/**
 * Fetches the authenticated athlete profile and caches it for later rendering.
 */
export const getUsersDetails = async (accessToken) => {
  if (await stravaRateLimiter.request()) {
    const apiUrl = `${baseURL}/athlete`;
    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 200) {
        localStorage.setItem('athlete', JSON.stringify(response.data));
        return response;
      } else {
        throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
      }
    } catch (error) {
      throw createStravaError(
        `Error while fetching athlete details: ${error.message}`,
        error,
      );
    }
  } else {
    throw new Error('Exceeded the strava rate limit. Please try again later.');
  }
};

/**
 * Fetches the authenticated athlete's Strava clubs.
 */
export const getUsersClubs = async (accessToken) => {
  if (await stravaRateLimiter.request()) {
    try {
      const response = await axios.get(`${baseURL}/athlete/clubs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response;
    } catch (error) {
      throw new Error(
        'Error while retrieving activities. Unable to fetch ',
        `${error.message}`,
      );
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};

/**
 * Fetches users who gave kudos on a specific activity.
 */
export const getKudoersByActivityId = async (activityId, accessToken) => {
  const apiUrl = `${baseURL}/activities/${activityId}/kudos`;
  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Error while fetching athlete stats: ${error.message}`);
  }
};

/**
 * Fetches comments for a specific Strava activity.
 */
export const getCommentsByActivityId = async (activityId, accessToken) => {
  const apiUrl = `${baseURL}/activities/${activityId}/comments`;
  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Error while fetching athlete stats: ${error.message}`);
  }
};

/**
 * Fetches lap-level details for a Strava activity.
 */
export const getUserActivityLaps = async (activityId, accessToken) => {
  const apiUrl = `${baseURL}/activities/${activityId}/laps`;
  if (await stravaRateLimiter.request()) {
    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 200) {
        return response;
      } else {
        throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error while fetching athlete stats: ${error.message}`);
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};

/**
 * Fetches full activity details for the activity detail page.
 */
export const getDetailedAthleteData = async (id, accessToken) => {
  if (await stravaRateLimiter.request()) {
    const apiUrl = `${baseURL}/activities/${id}?include_all_efforts=true`;
    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 200) {
        console.log({ response });
        return response;
      } else {
        throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
      }
    } catch (error) {
      throw createStravaError(
        `Error while fetching athlete stats: ${error.message}`,
        error,
      );
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};

/**
 * @returns steam set
 *
 */
export const getAthleteStreams = async (id, accessToken) => {
  if (await stravaRateLimiter.request()) {
    const apiUrl = `${baseURL}/activities/${id}/streams?keys=latlng,distance,altitude,time,velocity_smooth,moving,grade_smooth&key_by_type=true`;
    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 200) {
        return response;
      } else {
        throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
      }
    } catch (error) {
      throw createStravaError(
        `Error while fetching athlete stats: ${error.message}`,
        error,
      );
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};
const getStoredAccessToken = () => {
  try {
    return JSON.parse(localStorage.getItem('access_token'));
  } catch (error) {
    return localStorage.getItem('access_token');
  }
};

/**
 * Revokes the stored Strava token using the OAuth revoke endpoint.
 */
export const deauthorizeUser = async () => {
  const accessToken = getStoredAccessToken();

  try {
    const response = await axios.post(auth_revoke_link, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(`Failed to revoke user authorization. Status: ${response.status}`);
    }
  } catch (error) {
    throw createStravaError(
      `Error while revoking user authorization: ${error.message}`,
      error,
    );
  }
};
