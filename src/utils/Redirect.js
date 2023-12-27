import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExchangeCodeFromURL, getAccessToken, catchErrors } from './helpers';

const Redirect = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function getToken() {
      try {
        const exchangeCode = new URLSearchParams(window.location.search).get('code');
        const code = await getExchangeCodeFromURL(exchangeCode);
        const response = await getAccessToken(code);

        if (response && response?.access_token) {
          setPayload(response);
          navigate('/');
        } else {
          setError('No access token found in the response.');
        }
      } catch (err) {
        setError('An error occurred while fetching the token.');
        console.error(err);
      }
    }

    getToken();
  }, [navigate]);

  useEffect(() => {
    if (error) {
      catchErrors(error + 'no access token found in the response');
    }
  }, [error]);

  return <p>Redirecting...</p>;
};

export default Redirect;
