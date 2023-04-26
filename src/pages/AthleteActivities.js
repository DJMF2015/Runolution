import React, { Suspense, useState, useEffect } from 'react';
import useAuthorization from '../utils/useAuth';
import fetcher from '../utils/fetcher';
import styled from 'styled-components';
import { mediaQueries } from '../utils/mediaQueries';
import { getAthleteActivities } from '../utils/functions';
import Pagination from '../utils/pagination';
import DropDown from '../components/ActivityDropDown';
import Search from '../utils/search';
import '../App.css';
import useSWR from 'swr';
import polyline from '@mapbox/polyline';
import { Link } from 'react-router-dom';

const AthleteActivities = () => {
  // const PAGE_SIZE = 30;
  // eslint-disable-next-line no-unused-vars
  const [payload, setPayload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityName, setActivityName] = useState([]);
  const [searchTxt, setSearchTxt] = useState('');
  const [selectedName, setFilteredName] = useState(null);
  // let [pageIndex, setPageIndex] = useState(1);
  // const { code } = useAuthorization(
  //   `https://www.strava.com/api/v3/athlete/activities?include_all_efforts=true&per_page=${PAGE_SIZE}&page=${pageIndex}&access_token=`
  // );
  // console.log(code);
  // const { data: result, error } = useSWR(code, fetcher, { suspense: true });

  useEffect(() => {
    // const athlete = localStorage.getItem('athlete');
    const token = localStorage.getItem('token');
    // parse athlete and token from local storage
    // const athleteId = JSON.parse(athlete);
    const accessToken = JSON.parse(token);
    setPayload(accessToken);
  }, []);
  useEffect(() => {
    if (payload) {
      getAthleteActivities(payload).then((response) => {
        console.log('activities: ', response.data);
        // setPayload(response);
        setActivities(response.data);
      });
    }
  }, [payload]);

  const [nodes, setNodes] = useState([]);
  let filteredName = [];

  useEffect(() => {
    async function fetchData() {
      // const stravaActivityResponse = result;
      const stravaActivityResponse = activities;
      let polylines = [];
      for (let i in stravaActivityResponse) {
        const activityName = stravaActivityResponse[i]?.name;
        let activity_polyline = stravaActivityResponse?.[i]?.map?.summary_polyline;
        setActivityName(activityName);
        polylines.push({
          activityPositions: polyline.decode(activity_polyline),
          activityName: activityName,
        });
      }
      setNodes(polylines);
    }
    fetchData();
  }, [activities]);

  if (selectedName) {
    filteredName = activities.filter((activity, i) => activity.name === selectedName);
    console.log(filteredName);
  } else {
    filteredName = activities;
  }

  // TODO implementing search bar filtering

  // if (error) return <h2>Could not fetch activities.</h2>;
  if (!activities) return <Suspense fallback={<div>loading...</div>}></Suspense>;

  return (
    <>
      <br></br>
      {/* wire up search filter to display output */}
      {/* <Search searchTxt={searchTxt} updateSearchTxt={setSearchTxt} /> */}
      <DropDown setFilteredName={setFilteredName} result={activities} />
      {/* <Pagination
        pageIndex={pageIndex}
        onPageChange={(currentPage) => setPageIndex(currentPage)}
      /> */}
      {/* {result.length > 0 &&
        result.map((activity, index) => (
          <>
            <CardDetails>
              <table>
                <Link
                  to="/activity"
                  state={{ from: activity }}
                  key={`${activity.id}--${activity.moving_time}--${activity.average_heartrate}`}
                >
                  <div>{activity.name}</div>
                </Link>
              </div>
            </CardDetails>
          </>
        ))}{' '} */}
      {filteredName.map((activity, i) => (
        <>
          <div key={i}>
            <Link
              to="/activity"
              state={{ from: activity }}
              key={`${activity.id}--${activity.moving_time}--${activity.average_heartrate}`}
            >
              <h2>{activity.name}</h2>
            </Link>
            <p>{activity.distance} miles</p>
            <p>{activity.moving_time} seconds</p>
            <p>Date: {activity.start_date}</p>
            <p>kudos: {activity.kudos_count}</p>
          </div>
        </>
      ))}
      <div>
        <br></br>
      </div>
    </>
  );
};
const CardDetails = styled.tr`
  display: inline-flex;
  position: relative;
  color: black;
  font-weight: 200;
  justify-content: center;
  margin: 5px;
  margin-left: 5rem;
  top: 1rem;
  ${mediaQueries('md')` 
  display: inline; 
  justify-content: center; 
   margin-left: 10rem;
   font-size:.9rem; 
  
`}
`;

export default AthleteActivities;
