import React, { useState } from 'react';
import StravaConnectBtn from '../strava_connect_orange.svg';
import PoweredByStrava from '../powered_by_strava_light.svg';
import styled from 'styled-components';
import { client_id } from '../utils/config';

const Login = () => {
  const [logout, setLoggedOut] = useState(true);
  const redirectUrl = 'http://strava-personal-dashboard.vercel.app/redirect';

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
            <CardWrapper>
              <ImageButton
                src={StravaConnectBtn}
                alt="Strava Connect Button"
                onClick={handleLogin}
              />
              <ImageButton src={PoweredByStrava} alt="powered by strava" />
            </CardWrapper>
          </StyledLoginContainer>
        </StyledButtonWrapper>
      )}
    </>
  );
};

export default Login;

const StyledLoginContainer = styled.main`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  height: 100vh;
`;
const StyledButtonWrapper = styled.div`
  background-color: ${(props) => props.theme.colour.black};
  display: flex;
  border-radius: 10px;
  border-color: aliceblue;
  z-index: 1000;
`;

const CardWrapper = styled.div`
  width: 30rem;
  height: 20rem;
  margin: 0 auto;
  border-radius: 0.4rem;
  background-color: ${(props) => props.theme.colour.grey};
`;

const ImageButton = styled.img`
  display: flex;
  position: relative;
  margin: 0 auto;
  width: 85%;
  height: 10rem;
`;
