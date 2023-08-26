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
    console.log(error);
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
    console.log(error);
  }
};

/**
 *
 * @param { json array} payload  an async function
 * @returns {function} store payload to local storage
 */
const storePayloadToLocalStorage = (payload) => {
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
      console.error(err);
    });
  };
};

export const checkIfTokenExpired = async (expires_in, expires_at) => {
  if (expires_in && expires_at) {
    const expirationTime = new Date(expires_at * 1000); // Convert to milliseconds
    const currentTime = new Date();
    if (currentTime > expirationTime) {
      const res = await getNewAccessToken(); // Call API to get a new access token
    } else {
      console.log('Token not expired');
    }
  }
};
