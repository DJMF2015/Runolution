import { useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import Login from './Login';
import styled from 'styled-components';
import { mediaQueries } from '../utils/mediaQueries';
import {
  getKmsToMiles,
  getMilesToKms,
  getMetresToFeet,
  getNoOfMtEverests,
  getUnitsWithCommas,
  getCurrentYear,
} from '../utils/conversion';
const AthleteStats = () => {
  const [payload, setPayload] = useState([]);
  const [user, setUserData] = useState([]);

  useEffect(() => {
    const athlete = localStorage.getItem('athlete_id');
    const token = localStorage.getItem('access_token');
    const payloads = localStorage.getItem('payload');
    // parse athlete and token from local storage
    const athleteId = JSON.parse(athlete);
    const accessToken = JSON.parse(token);
    const payloadData = JSON.parse(payloads);
    setPayload({
      athlete: athleteId,
      access_token: accessToken,
      payloadData: payloadData,
    });
  }, [payload.athlete, payload.access_token]);

  useEffect(() => {
    async function fetchData() {
      if (payload.athlete && payload.access_token) {
        await getAthleteStats(payload.athlete, payload.access_token).then((response) => {
          setUserData(response);
        });
      }
    }
    fetchData();
  }, [payload]);
  // if (error) return <h1>Something went wrong!</h1>;
  // if (!result) return <h1>Loading...</h1>;
  return (
    <div>
      <h2
        style={{
          textAlign: 'center',
          color: 'brown',
        }}
      >
        {getCurrentYear()}
      </h2>

      {/* check if user and user.data available before rendering */}
      {user && user?.data ? (
        <Wrapper>
          <CardContainer>
            <CardDetails>
              <Image
                src={payload?.payloadData?.athlete?.profile}
                width={250}
                height={300}
                alt="DavidF"
              />

              <StatDetails>
                <h3 style={{ color: '#FF4500' }}>All Time Total</h3>
                {getKmsToMiles(user?.data?.all_run_totals?.distance)}
              </StatDetails>
              <StatDetails>
                {getMilesToKms(user?.data?.all_run_totals?.distance)}
              </StatDetails>
              <StatDetails>{'Runs: ' + user?.data?.all_run_totals?.count} </StatDetails>
              <StatDetails>
                {getUnitsWithCommas(user?.data.all_run_totals.elevation_gain).concat(
                  ' mtrs'
                )}
              </StatDetails>
              <StatDetails>
                {getMetresToFeet(user?.data.all_run_totals.elevation_gain)}
              </StatDetails>
              <StatDetails>
                {'Mnt. Everests: ' +
                  getNoOfMtEverests(user?.data.all_run_totals.elevation_gain)}
              </StatDetails>
              <StatDetails>
                <h3 style={{ color: '#FF4500' }}>Year To Date</h3>
                {getKmsToMiles(user?.data.ytd_run_totals.distance)}
              </StatDetails>
              <StatDetails>
                {getMilesToKms(user?.data.ytd_run_totals.distance)}
              </StatDetails>
              <StatDetails>{'Runs: ' + user?.data.ytd_run_totals.count}</StatDetails>
              <StatDetails>
                {getUnitsWithCommas(user?.data.ytd_run_totals.elevation_gain).concat(
                  ' mtrs'
                )}
              </StatDetails>
              <StatDetails>
                {'Mnt. Everests: ' +
                  getNoOfMtEverests(user?.data.ytd_run_totals.elevation_gain)}
              </StatDetails>
              <StatDetails>
                {getMetresToFeet(user?.data.ytd_run_totals.elevation_gain)}
              </StatDetails>
            </CardDetails>
          </CardContainer>
        </Wrapper>
      ) : (
        <Login />
      )}
    </div>
  );
};
const Image = styled.img`
  max-height: 350px;
  max-width: 225px;
  object-fit: contain;
  position: relative;
  margin-left: 10em;
  top: 1rem;
  ${mediaQueries('md')` 
 height: 150px;
 width: 250px;
   object-fit: contain;
  display: flex;
  flex-shrink: 1; 
  margin-top: 5rem;
  position: relative;
  margin: 25px;
`}
`;

const CardContainer = styled.div`
  position: relative;
  margin: auto;
  display: grid;
  /* columns: 2; */
  column-count: 2;
  top: 2em;
  padding: 20px;
  color: #ffff;
  background-color: ghostwhite;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 10px 10px 25px -16px rgba(0, 0, 0, 0.75);
  width: 50vw;
  height: 90vh;
  border-radius: 20px;
  border: darkgrey solid;
  ${mediaQueries('md')`  
  position: relative;
  text-align: left;
  margin: auto; 
  top: 0em;
  padding: 20px;
  color: #ffff;
  background-color: ghostwhite;
  width: 65vw;
  height: 70vh;
  border-radius: 20px;
`}
`;

const StatDetails = styled.h4`
  position: relative;
  margin-left: -5em;
  bottom: 20em;
`;
const Wrapper = styled.div`
  display: grid;
  /* columns: 2; */
  column-count: 2;
  ${CardContainer} {
    cursor: pointer;
    &:hover,
    &:focus {
      box-shadow: 0 10px 20px -5px rgba(5, 5, 0, 0.75);
    }
    ${mediaQueries('md')`  
    width: 85vw;
    height: 70vh;
    border-radius: 20px;

`}
  }
`;
const CardDetails = styled.div`
  display: inline-block;
  color: black;
  font-size: 18px;
  margin-top: 4rem;
  justify-content: center;
  margin-left: 10rem;
  margin-right: 10rem;
  ${mediaQueries('md')` 
  display: inline; 
  justify-content: center; 
   margin-left: 8rem;
   font-size:.9rem; 
  
`}
`;
const Header = styled.div`
  color: black;
  margin-bottom: 4rem;
  margin-left: 5rem;
  font-size: 2em;
  display: flex;
  align-items: center;
  ${mediaQueries('md')`
  color: black;
  font-weight: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
`}
`;
export default AthleteStats;
