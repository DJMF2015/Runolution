import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExchangeCodeFromURL, getAccessToken } from './functions';
// create context to store payload data
const Redirect = () => {
  const navigate = useNavigate();
  const [authCode, setAuthToken] = useState('');
  const [payload, setPayload] = useState([]);
  useEffect(() => {
    async function getToken() {
      const urlLocation = new URLSearchParams(window.location.search).get('code');
      console.log('urlLocation', urlLocation);
      const data = await getExchangeCodeFromURL(urlLocation);
      setAuthToken(data);

      const response = await getAccessToken(data);
      console.log('response', response);
      setPayload(response);
    }

    getToken();
  }, [payload]);
  console.log('payload', payload);

  // store the payload from useeffect getToken() function into local storage and ContextProvider
  useEffect(() => {
    if (payload && payload?.access_token) {
      localStorage.setItem('payload', JSON.stringify(payload));
      localStorage.setItem('access_token', JSON.stringify(payload.access_token));
      localStorage.setItem('refresh_token', JSON.stringify(payload.refresh_token));
      localStorage.setItem('expires_in', JSON.stringify(payload.expires_in));
      localStorage.setItem('athlete_id', JSON.stringify(payload.athlete.id));
      navigate('/', { state: { payload: payload } });
    }
  }, [payload]);
  return <div>Redirecting...</div>;
};
export default Redirect;
