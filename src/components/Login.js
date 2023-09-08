import React, { useState } from 'react';
import StravaConnectBtn from '../strava_connect_orange.svg';
import styled from 'styled-components';
import { client_id } from '../utils/config';
const Login = () => {
  const [logout, setLoggedOut] = useState(true);
  const redirectUrl = 'strava-personal-dashboard.vercel.app/redirect';

  const handleLogin = () => {
    localStorage.clear();
    setLoggedOut(!logout);
    window.location = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=read_all,activity:read_all,profile:read_all,activity:write`;
  };

  return (
    <>
      {logout && (
        <StyledButtonWrapper>
          <StyledLoginContainer>
            <img
              src={StravaConnectBtn}
              alt="Strava Connect Button"
              onClick={handleLogin}
            />
          </StyledLoginContainer>
        </StyledButtonWrapper>
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
  gap: 1rem;
  margin: 0 auto;
  height: 100vh;
`;
const StyledButtonWrapper = styled.div`
  background-color: ${(props) => props.theme.colour.grey};
  display: flex;
  border-radius: 10px;
  border-color: aliceblue;
  z-index: 1000;
`;
