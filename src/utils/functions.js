import axios from 'axios';
import { baseURL } from './config';
import { removeDataAfterDuration } from './helpers';
import { RateLimiter } from './rateLimiter';

const stravaRateLimiter = new RateLimiter(100, 15 * 60 * 1000);

const createStravaError = (message, error) => {
  const status = error?.response?.status;
  const stravaError = new Error(message);
  stravaError.status = status;
  stravaError.response = error?.response;
  stravaError.originalError = error;
  return stravaError;
};

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

export const getAthleteActivities = async (accessToken, per_page, index) => {
  console.log(per_page, index);
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

export const getUsersClubs = async (accessToken) => {
  if (await stravaRateLimiter.request()) {
    try {
      const response = await axios.get(`${baseURL}/athlete/clubs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response;
    } catch (error) {
      console.log(error);
    }
  } else {
    throw new Error('Exceeded the Strava rate limit. Please try again later.');
  }
};

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

/*  get detailed activity data */
export const getDetailedAthleteData = async (id, accessToken) => {
  if (await stravaRateLimiter.request()) {
    const apiUrl = `${baseURL}/activities/${id}`;
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

// deauthorize a user from the strava app
export const deauthorizeUser = async () => {
  const accessToken = localStorage.getItem('access_token');
  // remove %22 prefix and "' from access token string before sending to strava
  const removePrefix = accessToken
    .replace(/%22/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '');

  const apiurl = `https://www.strava.com/oauth/deauthorize?access_token=${removePrefix}`;
  try {
    const response = await axios.post(apiurl);
    if (response.status === 200) {
      console.log(response);
      return response;
    } else {
      throw new Error(`Failed to deauthorize user. Status: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Error while deauthorizing user: ${error.message}`);
  }
};
