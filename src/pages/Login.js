import React, { useEffect, useState } from 'react';
import StravaConnectBtn from '../strava_connect_orange.svg';
import styled from 'styled-components';
const Login = () => {
  const [logout, setLoggedOut] = useState(true);
  const redirectUrl = 'http://localhost:3000/redirect';

  const handleLogin = () => {
    localStorage.clear();
    setLoggedOut(!logout);
    window.location = `http://www.strava.com/oauth/authorize?client_id=27989&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=read_all,activity:read_all,profile:read_all,activity:write`;
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

const StyledLoginButton = styled.a`
  display: inline-block;
  min-width: 80px;
  background-color: #fc5200;
  height: 48px;
  width: 6%;
  text-align: center;
  margin-top: -7em;
  line-height: 48px;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  color: #fff;
  font-weight: 700;
  &:hover,
  &:focus {
    text-decoration: none;
    filter: brightness(1.1);
  }
`;
