import axios from 'axios';

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
    localStorage.setItem('athlete', JSON.stringify(response.data));
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

/*  get detailed activity data */
export const getDetailedAthleteData = async (id, accessToken) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};
