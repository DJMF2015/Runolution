import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import styled from 'styled-components';
import { Run } from '@styled-icons/boxicons-regular/Run';
import { Bicycle } from '@styled-icons/bootstrap/Bicycle';
import Login from './Login';
import {
  getKmsToMiles,
  getMilesToKms,
  getMetresToFeet,
  getNoOfMtEverests,
} from '../utils/conversion';
const AthleteStats = () => {
  const [payload, setPayload] = useState([]);
  const [user, setUserData] = useState([]);

  useEffect(() => {
    const athlete = localStorage.getItem('athlete');
    const token = localStorage.getItem('access_token');
    const athleteId = JSON.parse(athlete) || {};
    const accessToken = JSON.parse(token);
    setPayload({
      athlete: athleteId?.id,
      athleteName: athleteId?.firstname + ' ' + athleteId?.lastname,
      athleteProfile: athleteId?.profile_medium,
      athleteClubs: athleteId?.clubs,
      athleteFollowers: athleteId?.follower_count,
      access_token: accessToken,
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

  return (
    <div>
      {!user?.data ? (
        <Login />
      ) : (
        <>
          <AvatarImage src={payload?.athleteProfile} alt="Avatar" />
          <Container>
            <Column>
              <TableHeading>All Time Totals</TableHeading>
              <RunIcon />
              <TableData> {'Runs: ' + user?.data?.all_run_totals?.count}</TableData>
              <TableData>
                {'Miles:'} {getKmsToMiles(user?.data?.all_run_totals?.distance)}
              </TableData>
              <TableData>
                {'Kms: '}
                {getMilesToKms(user?.data?.all_run_totals?.distance)}
              </TableData>

              <TableData>
                {'Elevation:'} {getMetresToFeet(user?.data.all_run_totals.elevation_gain)}
              </TableData>
              <TableData>
                {' '}
                {'No. of Everests: ' +
                  getNoOfMtEverests(user?.data.all_run_totals.elevation_gain)}
              </TableData>
            </Column>
            <Column>
              <TableHeading></TableHeading>
              <BikeIcon />
              <TableData>{'Rides: ' + user?.data?.all_ride_totals?.count}</TableData>
              <TableData>
                {' '}
                Miles: {getKmsToMiles(user?.data?.all_ride_totals?.distance)}
              </TableData>
              <TableData>
                {'Kms: '}
                {getMilesToKms(user?.data?.all_ride_totals?.distance)}
              </TableData>
              <TableData>
                {'Elevation: '}
                {getMetresToFeet(user?.data.all_ride_totals.elevation_gain)}
              </TableData>
              <TableData>
                {'No. of Everests: ' +
                  getNoOfMtEverests(user?.data.ytd_ride_totals.elevation_gain)}
              </TableData>
            </Column>
            <Column>
              <TableHeading>Year To Date</TableHeading>
              <RunIcon />
              <TableData>{'Runs: ' + user?.data.ytd_run_totals.count}</TableData>

              <TableData>
                {'Miles: '}
                {getKmsToMiles(user?.data.ytd_run_totals.distance)}{' '}
              </TableData>
              <TableData>
                {' '}
                {'Kms: '} {getMilesToKms(user?.data.ytd_run_totals.distance)}{' '}
              </TableData>
              <TableData>
                {'Elevation: '}
                {getMetresToFeet(user?.data.ytd_run_totals.elevation_gain).concat()}
              </TableData>
              <TableData>
                {' '}
                {'Mnt. Everests: ' +
                  getNoOfMtEverests(user?.data.ytd_run_totals.elevation_gain)}
              </TableData>
            </Column>
            <Column>
              <TableHeading></TableHeading>
              <BikeIcon />
              <TableData>{'Runs: ' + user?.data.ytd_run_totals.count}</TableData>

              <TableData>
                {' Miles: '}
                {getKmsToMiles(user?.data.ytd_ride_totals.distance)}{' '}
              </TableData>
              <TableData>
                {' '}
                {'Kms: '} {getMilesToKms(user?.data.ytd_ride_totals.distance)}
              </TableData>
              <TableData>
                {'Elevation: '}
                {getMetresToFeet(user?.data.ytd_ride_totals.elevation_gain).concat()}
              </TableData>
              <TableData>
                {' '}
                {'Mnt. Everests: ' +
                  getNoOfMtEverests(user?.data.ytd_ride_totals.elevation_gain)}
              </TableData>
            </Column>
          </Container>
        </>
      )}
    </div>
  );
};

export default AthleteStats;

const Container = styled.div`
  display: grid;
  margin: 0 2rem 1rem 22rem;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 5px;

  @media (max-width: 860px) {
    display: none;
  }
`;

const Column = styled.div`
  display: grid;
  grid-template-rows: repeat(5, 1fr);
`;

const TableHeading = styled.h2`
  font-size: 1.2rem;
  text-align: left;
  color: ${(props) => props.theme.colour.black};
  margin-top: 5px;
  @media screen and (max-width: 1068px) {
    font-size: 0.7rem;
  }
`;

const TableData = styled.p`
  font-size: 14px;
  margin-top: 1rem;
  @media screen and (max-width: 1048px) {
    font-size: 0.7rem;
  }
`;

const RunIcon = styled(Run)`
  width: 2rem;
  height: 2rem;
  margin: 0 0 0 0;
  color: ${(props) => props.theme.colour.strava};
`;

const BikeIcon = styled(Bicycle)`
  width: 2rem;
  height: 2rem;
  margin: 0 0 0 0;
  color: ${(props) => props.theme.colour.strava};
`;

const AvatarImage = styled.img`
  margin-top: 1rem;
  width: 7vw;
  border-radius: 50%;
  height: 7vw;
  display: flex;
  align-items: flex-end;
  position: absolute;
  right: 3rem;

  @media screen and (max-width: 1048px) {
    display: none;
  }
`;
