import axios from 'axios';

// get exchange code from URL to retrieve the access token
export const getExchangeCodeFromURL = (token) => {
  if (token && window.location.href.includes('code')) {
    const authToken = window.location.href.split('=code')[0].split('&')[1].split('=')[1];
    return authToken;
  }
};

// get access token from local storage if it exists and is not expired and set to local storage
export const getAccessToken = async (authCode) => {
  try {
    const response = await axios.post(
      `https://www.strava.com/api/v3/oauth/token?client_id=27989&client_secret=183e7360ea130a4ded02e4fb219730c7b42e7e13&code=${authCode}&grant_type=authorization_code`
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
 * @returns {function}
 */
const storePayloadToLocalStorage = (payload) => {
  const keysToStore = {
    payload,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    expires_at: payload.expires_at,
    athlete_id: payload.athlete.id,
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
