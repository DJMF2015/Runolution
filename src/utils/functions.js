import axios from 'axios';
export const LOCALSTORAGE_KEYS = {
  access_token: 'access_token',
  refresh_token: 'refresh_token',
  expire_in: 'expire_in',
  expires_at: 'expires_at',
  athlete_id: 'athlete_id',
  payload: 'payload',
};
const auth_link = 'https://www.strava.com/oauth/token';
const baseURL = 'https://www.strava.com/api/v3';
const client_id = process.env.REACT_APP_CLIENT_ID;
const client_secret = process.env.REACT_APP_CLIENT_SECRET;
const refresh_token = process.env.REACT_APP_REFRESH_SECRET;

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
  const { access_token, refresh_token, expires_in, expires_at, athlete } = payload;
  localStorage.setItem('payload', JSON.stringify(payload));
  localStorage.setItem('access_token', JSON.stringify(access_token));
  localStorage.setItem('refresh_token', JSON.stringify(refresh_token));
  localStorage.setItem('expires_in', JSON.stringify(expires_in));
  localStorage.setItem('expires_at', JSON.stringify(expires_at));
  localStorage.setItem('athlete_id', JSON.stringify(athlete.id));
};

export async function authenticateWithStrava() {
  const authResponse = await Promise.all([
    axios.post(
      `${auth_link}?client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refresh_token}&grant_type=refresh_token`
    ),
  ]);
  return authResponse;
}

// export const getAccessTokenFromLocalStorage = () => {
//   const storedPayload = localStorage.getItem('payload');
//   const storedAccessToken = localStorage.getItem('access_token');
//   const storedRefreshToken = localStorage.getItem('refresh_token');
//   const storedExpiresAt = localStorage.getItem('expires_at');
//   const storedAthleteId = localStorage.getItem('athlete_id');

//   const payload = storedPayload ? JSON.parse(storedPayload) : null;
//   const accessToken = storedAccessToken ? JSON.parse(storedAccessToken) : '';
//   const refreshToken = storedRefreshToken ? JSON.parse(storedRefreshToken) : '';
//   const expiresAt = storedExpiresAt ? JSON.parse(storedExpiresAt) : null;
//   const athleteId = storedAthleteId ? JSON.parse(storedAthleteId) : null;

//   if (!payload || !accessToken || !refreshToken || !expiresAt || !athleteId) {
//     return;
//   }

//   const now = new Date().getTime() / 1000;
//   console.log('now', now);
//   console.log('expiresAt', expiresAt);
//   console.log('expires in', expiresAt - now);
//   if (expiresAt < now + 21600) {
//     // check if token has expired or will expire in the next 6 hours
//     const url = `https://www.strava.com/api/v3/oauth/token?client_id=${process.env.REACT_APP_STRAVA_CLIENT_ID}&client_secret=${process.env.REACT_APP_STRAVA_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${refreshToken}`;

//     fetch(url, {
//       method: 'POST',
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         localStorage.setItem('access_token', JSON.stringify(data.access_token));
//         localStorage.setItem('refresh_token', JSON.stringify(data.refresh_token));
//         localStorage.setItem('expires_in', JSON.stringify(data.expires_in));
//         localStorage.setItem('expires_at', JSON.stringify(now + data.expires_in));
//       })
//       .catch((error) => {
//         console.error('Error refreshing Strava access token:', error);
//       });
//   } else {
//   }
//   console.log('accessToken', accessToken);
//   return accessToken;
// };

export const getAthleteStats = async (userId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/athletes/${userId}/stats`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};
// default index value is 1 to start from page 1
export const getAthleteActivities = async (accessToken, per_page, index) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${per_page}&page=${index}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getUsersDetails = async (accessToken) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/athlete`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getUsersClubs = async (accessToken) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/athlete/clubs`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getUsersClubActivities = async (clubId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/clubs/${clubId}/activities`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};
export const getAthleteRoutes = async (athleteId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getKudoersByActivityId = async (activityId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}/kudos`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getCommentsByActivityId = async (activityId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}/comments`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};
export const getUsersGearByGearId = async (gearId, accessToken) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/gear/${gearId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getUserActivityLaps = async (activityId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}/laps`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getAthleteRoutesByGPX = async (Id, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/routes/${Id}/export_gpx`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const getAthleteZones = async (accessToken) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/athlete/zones`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};
