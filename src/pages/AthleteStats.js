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
  // if (!result) return <h1>Loading...</h1>;
  return (
    <div>
      {/* check if user and user.data available before rendering */}
      {!user?.data ? (
        <Login />
      ) : (
        <CardDetails>
          <Header>
            {payload?.payloadData?.athlete?.firstname +
              ' ' +
              payload?.payloadData?.athlete?.lastname +
              ' | '}

            {payload?.payloadData?.athlete?.city +
              ' | ' +
              payload?.payloadData?.athlete?.state}
          </Header>

          <Image
            src={payload?.payloadData?.athlete?.profile}
            width={250}
            height={300}
            alt="DavidF"
          />

          <h3 style={{ color: '#FF4500' }}>All Time Total</h3>
          <h4>{getKmsToMiles(user?.data?.all_run_totals?.distance)}</h4>

          <h4> {getMilesToKms(user?.data?.all_run_totals?.distance)}</h4>
          <h4> {'Runs: ' + user?.data?.all_run_totals?.count}</h4>

          <h4>
            {' '}
            {getUnitsWithCommas(user?.data.all_run_totals.elevation_gain).concat(' mtrs')}
          </h4>

          <h4>{getMetresToFeet(user?.data.all_run_totals.elevation_gain)}</h4>

          <h4>
            {' '}
            {'Mnt. Everests: ' +
              getNoOfMtEverests(user?.data.all_run_totals.elevation_gain)}
          </h4>

          <h3 style={{ color: '#FF4500' }}>Year To Date</h3>
          <h4>{getKmsToMiles(user?.data.ytd_run_totals.distance)} </h4>

          <h4> {getMilesToKms(user?.data.ytd_run_totals.distance)} </h4>
          <h4> {'Runs: ' + user?.data.ytd_run_totals.count}</h4>

          <h4>
            {' '}
            {getUnitsWithCommas(user?.data.ytd_run_totals.elevation_gain).concat(' mtrs')}
          </h4>

          <h4>
            {' '}
            {'Mnt. Everests: ' +
              getNoOfMtEverests(user?.data.ytd_run_totals.elevation_gain)}
          </h4>

          <h4> {getMetresToFeet(user?.data.ytd_run_totals.elevation_gain)}</h4>
        </CardDetails>
      )}
    </div>
  );
};
const Image = styled.img`
  max-height: 350px;
  max-width: 225px;
  object-fit: contain;
  position: relative;
  margin: 1rem 2rem -1rem 3rem;
  margin-top: -2rem;
  ${mediaQueries('md')` 
 height: 150px;
 width: 250px;
   object-fit: contain;
  display: flex;
  flex-shrink: 1;  
  position: relative;
  margin: 55px 25px 25px 25px;
  margin-left: 5em;
`}

  ${mediaQueries('lg')`
  height: 150px;
  width: 250px;
  object-fit: contain;
  display: flex;
  flex-shrink: 1; 
  position: relative;
  margin: 55px 25px 25px 25px;
  margin-left: 5em;
`}
`;

const CardDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 0.3rem;
  position: sticky;
  float: right;
  margin-right: -20rem;
  text-align: left;
  color: black;
  width: 30%;
  margin-top: 1rem;
  justify-content: center;
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  padding: 0.5rem 0rem 0rem 1rem;

  h3 {
    color: black;
    margin: 1rem 2rem 1rem 3rem;
  }
  h4 {
    margin: 1rem 2rem 1rem 3rem;
  }
  ${mediaQueries('md')`
    display: inline-block;
    margin-left: 1rem;
    width: 40%;
    font-size: 0.9rem;
  `}

  ${mediaQueries('lg')`
    width: 30%;
  `}
`;

const Header = styled.div`
  color: red;
  flex-wrap: wrap;
  flex-direction: row;
  font-size: 1.25rem;
  align-items: left;
  margin: 1rem 2rem 1rem 3rem;
  margin-top: 2em;
  justify-content: left;
  ${mediaQueries('md')`
  color: black;
  font-weight: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
`};
`;
export default AthleteStats;
