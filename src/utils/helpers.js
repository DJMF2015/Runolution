import axios from 'axios';
import { auth_link, client_secret, client_id } from './config';

const STRAVA_AUTH_KEYS = [
  'payload',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
];

/**
 * Removes only Strava authentication values from localStorage.
 * Cached activity and athlete data are intentionally left untouched so the app
 * can still render stored data without a live session.
 */
export const clearStravaAuth = () => {
  STRAVA_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

/**
 * Checks whether a localStorage key exists without parsing the stored value.
 */
export const hasStoredData = (key) => {
  return localStorage.getItem(key) !== null;
};

/**
 * Normalizes the different auth error shapes used by Axios and local token
 * checks into a single boolean guard.
 */
export const isUnauthorizedError = (error) => {
  return error?.isAuthError || error?.status === 401 || error?.response?.status === 401;
};

/**
 * Wraps an underlying Axios/token error with auth-specific metadata.
 */
const createAuthError = (message, error) => {
  const authError = new Error(`${message} ${error.message}`);
  authError.isAuthError = true;
  authError.status = error?.response?.status;
  authError.response = error?.response;
  return authError;
};

const postOAuthTokenRequest = (params) => {
  return axios.post(auth_link, new URLSearchParams(params), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

/**
 * Extracts the Strava OAuth exchange code from the redirect URL.
 *
 * @param {string|null} token - Code query-string value from the redirect route.
 * @returns {string|undefined} OAuth code used for the token exchange.
 */
export const getExchangeCodeFromURL = (token) => {
  if (token && window.location.href.includes('code')) {
    const authToken = window.location.href.split('=code')[0].split('&')[1].split('=')[1];
    return authToken;
  }
};

/**
 * Exchanges a Strava OAuth code for an access/refresh token payload and stores
 * the resulting credentials in localStorage.
 */
export const getAccessToken = async (authCode) => {
  try {
    const response = await postOAuthTokenRequest({
      client_id,
      client_secret,
      code: authCode,
      grant_type: 'authorization_code',
    });
    if (response.data) {
      storePayloadToLocalStorage(response.data);
    }
    return response.data;
  } catch (error) {
    throw createAuthError('Error while fetching access token', error);
  }
};

/**
 * Refreshes the Strava access token using the stored refresh token.
 */
export const getNewAccessToken = async () => {
  const refreshToken = JSON.parse(localStorage.getItem('refresh_token'));

  if (!refreshToken) {
    const authError = new Error('No refresh token found');
    authError.isAuthError = true;
    throw authError;
  }

  try {
    const response = await postOAuthTokenRequest({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    if (response.data) {
      storePayloadToLocalStorage(response.data);
    }
    return response.data;
  } catch (error) {
    throw createAuthError('Error while fetching new access token', error);
  }
};

/**
 * Returns a valid access token, refreshing it shortly before expiry when needed.
 *
 * @param {number|string} expires_in - Strava expiry duration stored from auth.
 * @param {number|string} expires_at - Unix timestamp, in seconds, for expiry.
 * @returns {Promise<string|null>} Current or refreshed access token.
 */
export const checkIfTokenExpired = async (expires_in, expires_at) => {
  const accessToken = JSON.parse(localStorage.getItem('access_token'));

  if (expires_in && expires_at) {
    const expirationTime = Number(expires_at) * 1000;
    const currentTime = Date.now();
    const refreshBufferMs = 60 * 1000;

    if (currentTime >= expirationTime - refreshBufferMs) {
      const refreshedPayload = await getNewAccessToken();
      return refreshedPayload?.access_token || null;
    }
  }

  return accessToken || null;
};

/**
 * Removes stale cached data once it is older than the provided retention window.
 * Stored values without a `timestamp` field are currently left to existing
 * parsing/date behavior.
 *
 * @param {string} key - localStorage key to check.
 * @param {number} durationInDays - Maximum cache age in days.
 */
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
 * Stores the Strava OAuth payload and token fields used by refresh logic.
 *
 * @param {Object} payload - Token response returned by Strava.
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
 * Wraps an async function so rejected promises are re-thrown as standard Error
 * instances.
 *
 * @param {Function} fn - Async function to wrap.
 * @returns {Function} Wrapped function preserving the original arguments.
 */
export const catchErrors = (fn) => {
  return function (...args) {
    return fn(...args).catch((err) => {
      throw new Error(err);
    });
  };
};
