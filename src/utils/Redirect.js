import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExchangeCodeFromURL, getAccessToken } from './helpers';
const Redirect = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState([]);
  useEffect(() => {
    async function getToken() {
      const exchangeCode = new URLSearchParams(window.location.search).get('code');
      const code = await getExchangeCodeFromURL(exchangeCode);
      const response = await getAccessToken(code);
      setPayload(response);
    }

    getToken();
  }, [payload]);

  // check of access token has expired and if so then redirect to login page to get a new token from Strava
  useEffect(() => {
    const checkIfTokenExpired = () => {
      const expires_at = localStorage.getItem('expires_at');
      const expires_in = localStorage.getItem('expires_in');
      if (expires_in && expires_at) {
        const timeElapsed = Date.now() - expires_at;
        if (timeElapsed / 1000 > expires_in) {
          // if time elapsed is greater than expires_in then token has expired
          navigate('/login');
        }
      }
    };
    checkIfTokenExpired();
  });

  useEffect(() => {
    if (payload?.access_token) {
      navigate('/');
    }
  }, [payload, navigate]);
};
export default Redirect;
