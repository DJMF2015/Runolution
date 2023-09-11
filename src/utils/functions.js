import axios from 'axios';

export const getAthleteStats = async (userId, accessToken) => {
  const apiUrl = `https://www.strava.com/api/v3/athletes/${userId}/stats`;

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

export const getAthleteActivities = async (accessToken, per_page, index) => {
  const apiUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${per_page}&page=${index}`;
  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 200) {
      return response.data;
    } else {
    }
    throw new Error(`Failed to fetch athlete stats. Status: ${response.status}`);
  } catch (error) {
    throw new Error(`Error while fetching athlete stats: ${error.message}`);
  }
};

export const getUsersDetails = async (accessToken) => {
  const apiUrl = `https://www.strava.com/api/v3/athlete`;
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
    throw new Error(`Error while fetching athlete stats: ${error.message}`);
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

export const getKudoersByActivityId = async (activityId, accessToken) => {
  const apiUrl = `https://www.strava.com/api/v3/activities/${activityId}/kudos`;
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
  const apiUrl = `https://www.strava.com/api/v3/activities/${activityId}/comments`;
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
  const apiUrl = `https://www.strava.com/api/v3/activities/${activityId}/laps`;
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

/*  get detailed activity data */
export const getDetailedAthleteData = async (id, accessToken) => {
  const apiUrl = `https://www.strava.com/api/v3/activities/${id}`;
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

//upload activity to strava api
export const uploadActivity = async (formData, accessToken) => {
  try {
    const response = await axios.post(`https://www.strava.com/api/v3/uploads`, formData, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};
