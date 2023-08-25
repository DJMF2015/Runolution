import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import styled from 'styled-components';
import { Run } from '@styled-icons/boxicons-regular/Run';
import { Bicycle } from '@styled-icons/bootstrap/Bicycle';
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

  const AthleteProfile = ({ payload }) => {
    return (
      <>
        <AvatarProfile className="athletename">{payload?.athleteName}</AvatarProfile>
        <AvatarProfile className="followers">
          <b>{'Followers: '}</b> {payload?.athleteFollowers}
        </AvatarProfile>
        {payload?.athleteClubs?.length > 0 && (
          <AvatarProfile className="clubs">
            {' '}
            Clubs: {payload?.athleteClubs?.length}
          </AvatarProfile>
        )}
      </>
    );
  };

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
      {user?.data && (
        <>
          <AvatarImage src={payload?.athleteProfile} alt="Avatar" />
          <AthleteProfile payload={payload} />

          <Container>
            <Column>
              <TableHeading>All Time Totals</TableHeading>
              <RunIcon />
              <TableData>
                <b> {'Runs: '} </b> {user?.data?.all_run_totals?.count}
              </TableData>
              <TableData>
                <b>{'Miles:'} </b> {getKmsToMiles(user?.data?.all_run_totals?.distance)}
              </TableData>
              <TableData>
                <b>{'Kms: '}</b>
                {getMilesToKms(user?.data?.all_run_totals?.distance)}
              </TableData>
              <TableData>
                <b> {'Elevation:'} </b>
                {getMetresToFeet(user?.data.all_run_totals.elevation_gain)}
              </TableData>
              <TableData>
                <b> {'No. of Everests: '}</b>
                {getNoOfMtEverests(user?.data.all_run_totals.elevation_gain)}
              </TableData>
            </Column>
            <Column>
              <TableHeading></TableHeading>
              <BikeIcon />
              <TableData>
                <b>{'Rides: '} </b> {user?.data?.all_ride_totals?.count}
              </TableData>
              <TableData>
                <b> Miles:</b> {getKmsToMiles(user?.data?.all_ride_totals?.distance)}
              </TableData>
              <TableData>
                <b>{'Kms: '}</b>
                {getMilesToKms(user?.data?.all_ride_totals?.distance)}
              </TableData>
              <TableData>
                <b>{'Elevation: '}</b>
                {getMetresToFeet(user?.data.all_ride_totals.elevation_gain)}
              </TableData>
              <TableData>
                <b>{'No. of Everests: '}</b>
                {getNoOfMtEverests(user?.data.ytd_ride_totals.elevation_gain)}
              </TableData>
            </Column>
            <Column>
              <TableHeading>Year To Date</TableHeading>
              <RunIcon />
              <TableData>
                <b>{'Runs: '}</b> {user?.data.ytd_run_totals.count}
              </TableData>
              <TableData>
                <b>{'Miles: '}</b>
                {getKmsToMiles(user?.data.ytd_run_totals.distance)}{' '}
              </TableData>
              <TableData>
                <b>{'Kms: '}</b> {getMilesToKms(user?.data.ytd_run_totals.distance)}{' '}
              </TableData>
              <TableData>
                <b>{'Elevation: '}</b>
                {getMetresToFeet(user?.data.ytd_run_totals.elevation_gain).concat()}
              </TableData>
              <TableData>
                <b>{'Mnt. Everests: '}</b>
                {getNoOfMtEverests(user?.data.ytd_run_totals.elevation_gain)}
              </TableData>
            </Column>
            <Column>
              <TableHeading></TableHeading>
              <BikeIcon />
              <TableData>
                <b>{'Rides: '} </b>
                {user?.data.ytd_run_totals.count}
              </TableData>
              <TableData>
                <b> {' Miles: '}</b>
                {getKmsToMiles(user?.data.ytd_ride_totals.distance)}{' '}
              </TableData>
              <TableData>
                <b> {'Kms: '}</b> {getMilesToKms(user?.data.ytd_ride_totals.distance)}
              </TableData>
              <TableData>
                <b> {'Elevation: '} </b>
                {getMetresToFeet(user?.data.ytd_ride_totals.elevation_gain).concat()}
              </TableData>
              <TableData>
                <b>{'Mnt. Everests: '}</b>
                {getNoOfMtEverests(user?.data.ytd_ride_totals.elevation_gain)}
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
  margin: 0 11rem 1rem 20rem;
  grid-template-columns: repeat(4, 1fr);

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
  position: absolute;
  right: 5rem;

  &:hover {
    cursor: pointer;
    transform: scale(1.1);
  }

  @media screen and (max-width: 1048px) {
    display: none;
  }
`;

const AvatarProfile = styled.h4`
  margin-top: 9rem;
  width: 7vw;
  border-radius: 50%;
  height: 7vw;
  display: flex;
  position: absolute;
  right: 5rem;

  @media screen and (max-width: 1048px) {
    display: none;
  }

  &.athletename {
    margin-top: 9rem;
    margin-left: 1rem;
    font-size: 0.9rem;
    display: flex;
    position: absolute;
    right: 5rem;

    @media screen and (max-width: 1200px) {
      font-size: 0.7rem;
      margin-top: 7rem;
    }
    @media screen and (max-width: 1048px) {
      display: none;
    }
  }

  &.followers {
    margin-top: 11rem;
    margin-left: 1rem;
    font-size: 0.9rem;
    display: flex;
    position: absolute;
    right: 5rem;

    @media screen and (max-width: 1200px) {
      font-size: 0.7rem;
      margin-top: 9rem;
    }
    @media screen and (max-width: 1048px) {
      display: none;
    }
  }

  &.clubs {
    margin-top: 13rem;
    margin-left: 1rem;
    font-size: 0.9rem;
    display: flex;
    position: absolute;
    right: 5rem;

    @media screen and (max-width: 1200px) {
      font-size: 0.7rem;
      margin-top: 8rem;
    }

    @media screen and (max-width: 1048px) {
      display: none;
    }
  }
`;
