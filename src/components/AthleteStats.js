import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import styled from 'styled-components';
import { AthleteProfile } from './Profile';
import { Run } from '@styled-icons/boxicons-regular/Run';
import { Bicycle } from '@styled-icons/bootstrap/Bicycle';
import {
  getKmsToMiles,
  getMilesToKms,
  getMetresToFeet,
  getNoOfMtEverests,
} from '../utils/conversion';
const AthleteStats = () => {
  const athlete = JSON.parse(localStorage.getItem('athlete')) || {};
  const token = JSON.parse(localStorage.getItem('access_token'));

  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (athlete.id && token) {
        try {
          const athleteStats = await getAthleteStats(athlete.id, token);
          // Handle successful response here
          if (athleteStats) {
            setUser(athleteStats);
          }
        } catch (error) {
          console.error(error.message); // Log the error message
        }
      }
    }
    fetchData();
  }, [athlete.id, token]);

  const renderTableData = (label, data) => (
    <TableData>
      <b>{`${label} `}</b>
      {data}
    </TableData>
  );

  return (
    <div>
      {user?.data && (
        <>
          <AvatarImage src={athlete.profile_medium} alt="Avatar" />
          <AthleteProfile athlete={athlete} />

          <Container>
            <Column>
              <TableHeading>All Time Totals</TableHeading>
              <RunIcon />
              {renderTableData('Runs', user.data.all_run_totals.count)}
              {renderTableData('Miles', getKmsToMiles(user.data.all_run_totals.distance))}

              {renderTableData(
                'Kms: ',
                getMilesToKms(user?.data?.all_run_totals?.distance)
              )}

              {renderTableData(
                'Elevation: ',
                getMetresToFeet(user?.data.all_run_totals.elevation_gain)
              )}

              {renderTableData(
                'No of Everests: ',
                getNoOfMtEverests(user?.data.all_run_totals.elevation_gain)
              )}
            </Column>
            <Column>
              <TableHeading></TableHeading>
              <BikeIcon />
              {renderTableData('Rides: ', user?.data?.all_ride_totals?.count)}

              {renderTableData(
                'Distance: ',
                getKmsToMiles(user?.data?.all_ride_totals?.distance)
              )}

              {renderTableData(
                'Kms: ',
                getMilesToKms(user?.data?.all_ride_totals?.distance)
              )}

              {renderTableData(
                'Elevation: ',
                getMetresToFeet(user?.data.all_ride_totals.elevation_gain)
              )}

              {renderTableData(
                'No. of Everests: ',
                getNoOfMtEverests(user?.data.ytd_ride_totals.elevation_gain)
              )}
            </Column>
            <Column>
              <TableHeading>Year To Date</TableHeading>
              <RunIcon />
              {renderTableData('Runs: ', user?.data.ytd_run_totals.count)}

              {renderTableData(
                'Miles: ',
                getKmsToMiles(user?.data.ytd_run_totals.distance)
              )}

              {renderTableData(
                'Kms: ',
                getMilesToKms(user?.data.ytd_run_totals.distance)
              )}

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
              {renderTableData('Rides: ', user?.data.ytd_ride_totals.count)}
              {renderTableData(
                'Miles: ',
                getKmsToMiles(user?.data.ytd_ride_totals.distance)
              )}
              {renderTableData(
                'Kms: ',
                getMilesToKms(user?.data.ytd_ride_totals.distance)
              )}
              {renderTableData(
                'Elevation: ',
                getMetresToFeet(user?.data.ytd_ride_totals.elevation_gain).concat()
              )}
              {renderTableData(
                'Mnt. Everests: ',
                getNoOfMtEverests(user?.data.ytd_ride_totals.elevation_gain)
              )}
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
