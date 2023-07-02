import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExchangeCodeFromURL, getAccessToken } from './helpers';

const Redirect = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState([]);
  useEffect(() => {
    async function getToken() {
      const exchangeCode = new URLSearchParams(window.location.search).get('code');
      const code = await getExchangeCodeFromURL(exchangeCode); // get exchange code from URL
      const response = await getAccessToken(code); // get access token from Strava API

      setPayload(response);
    }

    getToken();
  }, [payload]);

  useEffect(() => {
    if (payload?.access_token) {
      navigate('/');
    }
  }, [payload, navigate]);
};

export default Redirect;
