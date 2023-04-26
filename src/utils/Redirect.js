import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExchangeCodeFromURL, getAccessToken } from '../utils/functions';
// create context to store payload data
const Redirect = () => {
  const navigate = useNavigate();
  const [authCode, setAuthToken] = useState('');
  const [payload, setPayload] = useState([]);
  // const getValue = React.useCallback(
  //   () => new URLSearchParams(window.location.search).get(param),
  //   [param]
  // );
  useEffect(() => {
    async function getToken() {
      // const urlLocation = new URLSearchParams(window.location.search).get('code');
      // console.log('urlLocation', urlLocation);
      const darta = await getExchangeCodeFromURL(window.location);
      setAuthToken(darta);

      const response = await getAccessToken(darta);
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
      localStorage.setItem('token', JSON.stringify(payload.access_token));
      localStorage.setItem('athlete', JSON.stringify(payload.athlete.id));
      navigate('/', { state: { payload: payload } });
    }
  }, [payload]);
  return <div>Redirecting...</div>;
};
export default Redirect;
