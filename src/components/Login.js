import React, { useState } from 'react';
import StravaConnectBtn from '../strava_connect_orange.svg';
import PoweredByStrava from '../powered_by_strava_light.svg';
import styled from 'styled-components';
import { client_id } from '../utils/config';

const Login = () => {
  const [logout, setLoggedOut] = useState(false);
  const redirectUrl = 'http://strava-personal-dashboard.vercel.app/redirect';

  const handleLogin = () => {
    setLoggedOut(!logout);
    window.location = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=read_all,activity:read_all,profile:read_all`;
  };

  return (
    <>
      {!logout && (
        <StyledButtonWrapper>
          <StyledLoginContainer>
            <br />
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
  position: absolute;
  width: 100%;
  display: flex;
  border-radius: 10px;
  z-index: 1000;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const CardWrapper = styled.div`
  width: 30rem;
  height: 20rem;
  margin: 0 auto;
  border-radius: 0.4rem;
  background-color: ${(props) => props.theme.colour.grey};

  @media (max-width: 768px) {
    width: 25rem;
    height: 20rem;
    margin: 0 auto;
    border-radius: 0.4rem;
    background-color: ${(props) => props.theme.colour.grey};
  }

  @media screen and (max-width: 425px) {
    width: 100%;
    height: 20rem;
    margin: 0 auto;
    border-radius: 0.4rem;
    background-color: ${(props) => props.theme.colour.grey};
  }
`;

const ImageButton = styled.img`
  display: flex;
  position: relative;
  margin: 0 auto;
  width: 85%;
  height: 10rem;

  &:hover {
    cursor: pointer;
    scale: 0.95;
  }

  @media (max-width: 768px) {
    width: 85%;
    height: 10rem;
  }

  @media screen and (max-width: 425px) {
    width: 85%;
    height: 10rem;
  }
`;

const StyledText = styled.h1`
  display: flex;
  font-size: 3rem;
  margin: 0 auto;
  text-align: center;
  color: ${(props) => props.theme.colour.white};
  font-style: italic;
`;
