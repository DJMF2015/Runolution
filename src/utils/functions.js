import axios from 'axios';

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
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

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

export const getAthletePhotos = async (athleteId, accessToken) => {
  try {
    const response = await axios.get(
      `https://www.strava.com/api/v3/athletes/${athleteId}/photos`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};
