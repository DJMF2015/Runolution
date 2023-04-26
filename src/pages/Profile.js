import React, { useState, useEffect } from 'react';
// import useSWR from 'swr';
// import fetcher from '../utils/fetcher';
// import useAuthorizaton from '../utils/useAuth';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';

import { mediaQueries } from '../utils/mediaQueries';

const Profile = () => {
  // const location = useLocation();
  const [payload, setPayload] = useState([]);

  useEffect(() => {
    const payload = localStorage.getItem('payload');
    const payloadData = JSON.parse(payload);
    setPayload(payloadData);
  }, []);

  // const { code } = useAuthorizaton(
  //   `https://www.strava.com/api/v3/athletes/${process.env.REACT_APP_ATHLETE_ID}?access_token=`
  // );
  // const { data: result, error } = useSWR(code, fetcher);

  // if (error) return <h1>Something went wrong!</h1>;
  if (!payload) return <h1>Loading...</h1>;

  return (
    <>
      <Wrapper>
        <CardContainer>
          <CardDetails>
            <Header>
              <h2>Profile</h2>
            </Header>

            {payload && (
              <>
                <img src={payload?.athlete?.profile} alt="David" />
                <h3>
                  Name: {payload?.athlete?.firstname} {''}
                  {payload?.athlete?.lastname}
                </h3>
                <h3> Sex: {payload?.athlete?.sex}</h3>
                <h3>City: {payload?.athlete?.city}</h3>
                <h3>Country: {payload?.athlete?.state}</h3>
              </>
            )}
          </CardDetails>
        </CardContainer>
      </Wrapper>
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
