import axios from 'axios';
import { auth_link, client_secret, client_id } from './config';

// get exchange token from URL to retrieve the access token
export const getExchangeCodeFromURL = (token) => {
  if (token && window.location.href.includes('code')) {
    const authToken = window.location.href.split('=code')[0].split('&')[1].split('=')[1];
    return authToken;
  }
};

// get new access token  from local storage if it exists and if not expired set to local storage
export const getAccessToken = async (authCode) => {
  try {
    const response = await axios.post(
      `${auth_link}?client_id=${client_id}&client_secret=${client_secret}&code=${authCode}&grant_type=authorization_code`
    );
    if (response.data) {
      storePayloadToLocalStorage(response.data);
    }
    return response.data;
  } catch (error) {
    throw new Error(`Error while fetching access token ${error.message}`);
  }
};

//get new access token using refresh token if the current access token has expired and set to local storage
export const getNewAccessToken = async () => {
  const refreshToken = JSON.parse(localStorage.getItem('refresh_token'));

  try {
    const response = await axios.post(
      `${auth_link}?client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refreshToken}&grant_type=refresh_token`
    );
    if (response.data) {
      storePayloadToLocalStorage(response.data);
    }
    return response.data;
  } catch (error) {
    throw new Error(`Error while fetching new access token ${error.message}`);
  }
};

/**
 *
 * @param {function} expires_in
 * @param {function} expires_at
 * @returns  check if token has expired and if so get new access token
 */
export const checkIfTokenExpired = async (expires_in, expires_at) => {
  if (expires_in && expires_at) {
    const expirationTime = new Date(expires_at * 1000); // Convert to milliseconds
    const currentTime = new Date();
    if (currentTime > expirationTime) {
      await getNewAccessToken();
    } else {
      return;
    }
  }
};

/**
 *
 * @param  {data} key
 * @param {integer} durationInDays
 */
// Utility function to remove data from local storage after 6 days to comply with Strava's regulations
export const removeDataAfterDuration = (key, durationInDays) => {
  const storedData = localStorage.getItem(key);

  if (storedData) {
    const storedTimestamp = new Date(JSON.parse(storedData).timestamp);
    const currentTimestamp = new Date();

    // Calculate the time difference in milliseconds
    const timeDifference = currentTimestamp - storedTimestamp;

    // Convert the time difference from milliseconds to days
    const timeDifferenceInDays = timeDifference / (1000 * 60 * 60 * 24);

    // Check if the stored data is older than the specified duration
    if (timeDifferenceInDays >= durationInDays) {
      localStorage.removeItem(key);
    }
  }
};

/**
 *
 * @param { json array} payload  an async function
 * @returns {function} store payload to local storage
 */
const storePayloadToLocalStorage = (payload) => {
  removeDataAfterDuration('payload', 6);
  const keysToStore = {
    payload,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    expires_at: payload.expires_at,
  };
  Object.entries(keysToStore).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
};

/**
 * Higher-order function for async/await error handling
 * @param {function} fn an async function
 * @returns {function}
 */
export const catchErrors = (fn) => {
  return function (...args) {
    return fn(...args).catch((err) => {
      throw new Error(err);
    });
  };
};
