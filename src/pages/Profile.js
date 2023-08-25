import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Login from '../components/Login';
import { mediaQueries } from '../utils/mediaQueries';

// NOTE: This file is no longer used in the app. It is here for reference only.
const Profile = () => {
  const [payload, setPayload] = useState([]);

  useEffect(() => {
    const payload = localStorage.getItem('payload');
    const payloadData = JSON.parse(payload);
    setPayload(payloadData);
  }, []);

  if (!payload) return <h1>Loading...</h1>;

  return (
    <>
      {!payload ? (
        <Login />
      ) : (
        <Wrapper>
          <CardContainer>
            <CardDetails>
              <Header>
                <h2>Profile</h2>
              </Header>
              <img src={payload?.athlete?.profile} alt="David" />
              <h3>
                Name: {payload?.athlete?.firstname} {''}
                {payload?.athlete?.lastname}
              </h3>
              <h3> Sex: {payload?.athlete?.sex}</h3>
              <h3>City: {payload?.athlete?.city}</h3>
              <h3>Country: {payload?.athlete?.state}</h3>
            </CardDetails>
          </CardContainer>
        </Wrapper>
      )}
    </>
  );
};
export default Profile;

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const CardContainer = styled.div`
  margin: 20px;
  padding: 20px;
  color: #ffff;
  background-color: ghostwhite;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 10px 10px 25px -16px rgba(0, 0, 0, 0.75);
  width: 35vw;
  height: 60vh;
  border-radius: 20px;
  border: darkgrey solid;

  @media (max-width: 768px) {
    width: 80vw;
    height: 50vh;
  }
`;

const CardDetails = styled.div`
  display: inline-block;
  color: black;
  font-weight: 300;
  justify-content: center;
  margin-left: 10rem;

  @media (max-width: 768px) {
    margin-left: 0;
    text-align: center;

    img {
      width: 50%;
    }
  }
  @media (max-width: 450px) {
    margin-left: 0;
    text-align: center;

    img {
      /* width: 50%;
       */
      display: none;
    }
  }
`;

const Header = styled.div`
  color: black;
  font-weight: 300;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;
