import React, { useState } from 'react';
import StravaConnectBtn from '../strava_connect_orange.svg';
import styled from 'styled-components';
import { client_id } from '../utils/config';
const Login = () => {
  const [logout, setLoggedOut] = useState(true);
  const redirectUrl = 'http://localhost:3000/redirect';

  const handleLogin = () => {
    localStorage.clear();
    setLoggedOut(!logout);
    window.location = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=read_all,activity:read_all,profile:read_all,activity:write`;
  };

  return (
    <>
      {logout && (
        <StyledLoginContainer>
          <img src={StravaConnectBtn} alt="Strava Connect Button" onClick={handleLogin} />
        </StyledLoginContainer>
      )}
    </>
  );
};

export default Login;

const StyledLoginContainer = styled.main`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f2f2f2;
  gap: 1rem;
  margin: 0 auto;
  height: 100vh;
`;
