import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Login from './Login';
import { catchErrors } from '../utils/helpers';
import {
  getUsersClubs,
  getUsersDetails,
  getUsersClubActivities,
} from '../utils/functions';
const AthleteClub = () => {
  const [clubData, setClubData] = useState([]);
  const [activities, setActivities] = useState([]);
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('access_token');
      const tokenData = JSON.parse(token);
      await getUsersDetails(tokenData).then((response) => {
        console.log(response.data);
        setClubData(response.data);
      });
    }
    catchErrors(fetchData());
  }, []);

  useEffect(() => {
    if (
      clubData.clubs === undefined ||
      clubData.clubs.length === 0 ||
      clubData.clubs[0].id === undefined ||
      clubData.clubs[0].id === 0
    ) {
      console.log('No club data');
    } else {
      const token = localStorage.getItem('access_token');
      const tokenData = JSON.parse(token);
      catchErrors(
        getUsersClubActivities(clubData.clubs[0].id, tokenData).then((response) => {
          console.log({ response });
          setActivities(response?.data);
        })
      );
    }
  }, [clubData]);

  return (
    <>
      {/* <Header>{clubData && clubData?.clubs[0]?.name}</Header> */}
      {!clubData ||
      clubData.clubs === undefined ||
      clubData.clubs.length === 0 ||
      clubData.clubs[0].id === undefined ? (
        <h2>Looks like you aren't a member of any Clubs yet!</h2>
      ) : (
        activities?.length > 0 &&
        activities.map((activity) => (
          <Wrapper
            key={`${activity?.firstname}-${activity?.lastname}-${activity?.moving_time}`}
          >
            <h4 style={{ marginTop: '2em' }}>
              {activity?.name}
              {':'} {activity?.athlete.firstname}
              {''} {activity?.athlete.lastname} {'Distance'}{' '}
              {(activity?.distance / 1000).toFixed(2)}
              {' kms '}
              {(activity?.elapsed_time / 60).toFixed(2)}
              {' mins'}
            </h4>
          </Wrapper>
        ))
      )}
    </>
  );
};

const Image = styled.img`
  display: flex;
  margin-top: 1rem;
  margin-left: 80vw;
`;

const Wrapper = styled.div`
  position: relative;
  display: inline;
  flex-wrap: wrap;
  text-align: center;
  h4:nth-child(even) {
    margin-right: 40vw;
    width: 100%;
    padding: 0.5em;
  }
  h4:hover {
    background-color: darkgray;
    color: white;
    font-size: 18px;
  }
`;

const Header = styled.h2`
  position: relative;
  text-align: center;
  color: #844d4d;
`;
export default AthleteClub;
