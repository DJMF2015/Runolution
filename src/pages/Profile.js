import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Login from './Login';
import { mediaQueries } from '../utils/mediaQueries';

const Profile = () => {
  const [payload, setPayload] = useState([]);

  useEffect(() => {
    const payload = localStorage.getItem('payload');
    const payloadData = JSON.parse(payload);
    setPayload(payloadData);
  }, []);

  // if (!payload) return <h1>Loading...</h1>;

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

const CardContainer = styled.div`
  position: relative;
  margin: 20px auto;
  top: 6em;
  padding: 20px;
  color: #ffff;
  background-color: ghostwhite;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 10px 10px 25px -16px rgba(0, 0, 0, 0.75);
  width: 35vw;
  height: 60vh;
  border-radius: 20px;
  border: darkgrey solid;
  ${mediaQueries('md')`  
  position: relative;
  margin: 20px auto;
  top: 6em;
  padding: 20px;
  color: #ffff;
  background-color: ghostwhite;
    width: 35vw;
  height: 60vh;
  border-radius: 20px;
`}
`;

const Wrapper = styled.div`
  ${CardContainer} {
    cursor: pointer;
    &:hover,
    &:focus {
      box-shadow: 0 10px 20px -5px rgba(5, 5, 0, 0.75);
    }
    ${mediaQueries('md')`  
      width: 35vw;
    height: 60vh;
    border-radius: 20px;
`}
  }
`;
const CardDetails = styled.div`
  display: inline-block;
  color: black;
  font-weight: 300;
  justify-content: center;
  margin-left: 10rem;
  ${mediaQueries('md')` 
  display: inline; 
  justify-content: center; 
   margin-left: 10rem;
   font-size:.9rem; 
  
`}
`;
const Header = styled.div`
  color: black;
  font-weight: 300;
  display: flex;
  justify-content: space-between;
  align-items: center;
  ${mediaQueries('md')`
  color: black;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: space-between;
`}
`;
