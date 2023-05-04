import React, { Suspense, useState, useEffect } from 'react';
import styled from 'styled-components';
import { mediaQueries } from '../utils/mediaQueries';
import { getAthleteActivities } from '../utils/functions';
import Pagination from '../utils/pagination';
import { catchErrors } from '../utils/helpers';
import { getKmsToMiles, getSecondstoMinutes, formattedDate } from '../utils/conversion';
import DropDown from '../components/ActivityDropDown';
import Login from './Login';
import Search from '../utils/search';
import '../App.css';
import polyline from '@mapbox/polyline';
import { Link } from 'react-router-dom';

const AthleteActivities = () => {
  const [payload, setPayload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityName, setActivityName] = useState([]);
  const [searchTxt, setSearchTxt] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  // const [selectedName, setFilteredName] = useState(null);
  const [nodes, setNodes] = useState([]);
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const accessToken = JSON.parse(token);
    setPayload(accessToken);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (payload && pageIndex) {
        setLoading(true);
        await getAthleteActivities(payload, 50, pageIndex).then((response) => {
          setActivities(response.data);
        });
      }
    }
    catchErrors(fetchData());
  }, [payload, pageIndex]);
  useEffect(() => {
    async function fetchData() {
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
      setLoading(false);
    }
    catchErrors(fetchData());
  }, [activities]);
  console.log({ nodes });

  // if (selectedName) {
  //   filteredName = activities.filter((activity, i) => activity.name === selectedName);
  //   console.log(filteredName);
  // } else {
  //   filteredName = activities;
  // }

  const filteredName = activities.filter((activity) => {
    return activity.name.toLowerCase().includes(searchTxt.toLowerCase());
  });
  if (loading)
    return (
      <h2>
        <Suspense>Fetching Activities...</Suspense>
      </h2>
    );
  if (!activities) return <Suspense fallback={<div>loading...</div>}></Suspense>;
  console.log(activities);
  return (
    <>
      {!payload && <Login />}
      <Search searchTxt={searchTxt} updateSearchTxt={setSearchTxt} />
      {/* <DropDown setFilteredName={setFilteredName} result={activities} /> */}
      <Pagination
        pageIndex={pageIndex}
        onPageChange={(currentPage) => setPageIndex(currentPage)}
      />

      <CardDetails>
        {payload &&
          filteredName.map((activity, i) => (
            <>
              <Cardborder>
                <div key={i}>
                  <Link
                    to="/activity"
                    state={{ from: activity }}
                    key={`${activity.id}--${activity.moving_time}--${activity.average_heartrate}`}
                  >
                    <h2>{activity.name}</h2>
                  </Link>
                  <p>{getKmsToMiles(activity.distance)}</p>
                  <p>{getSecondstoMinutes(activity.moving_time)} </p>
                  <p>Date: {formattedDate(activity.start_date)}</p>
                  <p>kudos: {activity.kudos_count}</p>
                </div>
              </Cardborder>
            </>
          ))}
      </CardDetails>
      <div></div>
    </>
  );
};
const CardDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 15em 1fr;
  grid-gap: 1rem;
  position: relative;
  color: black;
  background-color: #f5f5f5;
  font-size: 1rem;
  font-family: Comic Sans MS;
  font-weight: bold;
  text-align: center;
  margin: 15px 35px 5px 35px;
  font-weight: 200;
  padding: 5px;

  ${mediaQueries('md')` 
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  justify-content: center; 
   position: relative;
   font-size:.8rem; 
  
`}
`;

const Cardborder = styled.div`
  border: 2px solid black;
  border-radius: 5px;
  box-sizing: border-box;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  padding: 5px;
  margin: 0px 50px 05px 50px;

  ${mediaQueries('md')`
  border: 2px solid black;
  padding: 5px;
  margin: 0px 50px 05px 50px;
  border-radius: 5px;
  font-size:.8rem;
  `}
  /* hover */
  &:hover {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    transform: scale(1.05);
    transition: all 0.3s ease-in-out;
  }
`;

export default AthleteActivities;
