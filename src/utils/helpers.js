import axios from 'axios';
import * as htmlToImage from 'html-to-image';
import { client_secret, client_id, refresh_token, auth_link } from './config';
export const getExchangeCodeFromURL = (token) => {
  if (token && window.location.href.includes('code')) {
    const authToken = window.location.href.split('=code')[0].split('&')[1].split('=')[1];
    return authToken;
  }
};

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

//
export async function authenticateWithStrava() {
  const authResponse = await Promise.all([
    axios.post(
      `${auth_link}?client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refresh_token}&grant_type=refresh_token`
    ),
  ]);
  return authResponse;
}

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

const createFileName = (extension = '', ...names) => {
  if (!extension) {
    return '';
  }

  return `${names.join('')}.${extension}`;
};

export const useScreenShot = (node) => {
  const takeScreenShot = async (node) => {
    const dataURI = await htmlToImage.toJpeg(node);
    return dataURI;
  };

  const download = (image, { name = 'img', extension = 'jpg' } = {}) => {
    const a = document.createElement('a');
    a.href = image;
    a.download = createFileName(extension, name);
    a.click();
  };

  return { takeScreenShot, download };
  // const downloadScreenshot = () => takeScreenShot(ref.current).then(download);
};
