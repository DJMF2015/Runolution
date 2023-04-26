import { useEffect, useState, useCallback } from 'react';
/* A bit hacky but accepts an endpoint of the Api and returns a new accesstoken if expired */
// TODO: add check for expiration of accesstoken and store in localstorage
const useAuthorizaton = (url) => {
  const [code, setAccessToken] = useState([]);
  console.log({ url });
  const authorise_link = 'https://www.strava.com/oauth/token';
  //  useCallback to avoid automatically running on every render and infinite looping of API requests.
  const reAuthorize = useCallback(() => {
    function setAccessCode(code) {
      console.log({ code });
      setAccessToken(url + code.access_token);
    }

    const responseObject = {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify({
        client_id: process.env.REACT_APP_CLIENT_ID,
        client_secret: process.env.REACT_APP_CLIENT_SECRET,
        refresh_token: process.env.REACT_APP_REFRESH_SECRET,
        grant_type: 'refresh_token',
      }),
    };
    fetch(authorise_link, responseObject)
      .then((resp) => resp.json())
      .then((resp) => setAccessCode(resp));
  }, [url]);

  useEffect(() => {
    reAuthorize();
  }, [reAuthorize]);
  return { code };
};
export default useAuthorizaton;
