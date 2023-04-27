import React, { useState, useEffect } from 'react';
// import useSWR from 'swr';
// import fetcher from '../utils/fetcher';
import styled from 'styled-components';
import Login from './Login';
// import useAuthorizaton from '../utils/useAuth';
// import { useClub } from '../utils/hooks';
import {
  getUsersClubs,
  getUsersDetails,
  getUsersClubActivities,
} from '../utils/functions';
const AthleteClub = () => {
  const [clubData, setClubData] = useState([]);
  const [activities, setActivities] = useState([]);
  // const { code } = useAuthorizaton(
  //   `https://www.strava.com/api/v3/clubs/${process.env.REACT_APP_CLUB_ID}/activities?page=1&per_page=200&access_token=`
  // );
  // const { data: result, error } = useSWR(code, fetcher);
  // const { props, errors } = useClub();

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('access_token');
      const tokenData = JSON.parse(token);
      getUsersDetails(tokenData).then((response) => {});
      getUsersClubs(tokenData).then((response) => {
        setClubData(response.data[0]);
      });

      getUsersClubActivities(clubData.id, tokenData).then((response) => {
        console.log({ response });
        setActivities(response?.data);
      });
    }
    fetchData();
  }, [clubData.id]);

  // if (error || errors) return <h1>Something went wrong!</h1>;

  if (!clubData) return <h1>No Club Data! Are you a member of a club?</h1>;
  // if (!clubData || !activities)
  //   return (
  //     <div>
  //       <Login />
  //     </div>
  //   );
  return (
    <>
      {/* <Header>{clubData?.name}</Header> */}
      {!clubData ? (
        <Login />
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
