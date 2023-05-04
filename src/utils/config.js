const auth_link = 'https://www.strava.com/oauth/token';
const baseURL = 'https://www.strava.com/api/v3';
const client_id = process.env.REACT_APP_CLIENT_ID;
const client_secret = process.env.REACT_APP_CLIENT_SECRET;
const refresh_token = process.env.REACT_APP_REFRESH_SECRET;

export { auth_link, baseURL, client_id, client_secret, refresh_token };
