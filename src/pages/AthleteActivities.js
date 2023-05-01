import React, { Suspense, useState, useEffect } from 'react';
import styled from 'styled-components';
import { mediaQueries } from '../utils/mediaQueries';
import { getAthleteActivities } from '../utils/functions';
import Pagination from '../utils/pagination';
import { catchErrors } from '../utils/helpers';
import DropDown from '../components/ActivityDropDown';
import Search from '../utils/search';
import '../App.css';
import polyline from '@mapbox/polyline';
import { Link } from 'react-router-dom';

const AthleteActivities = () => {
  // eslint-disable-next-line no-unused-vars
  const [payload, setPayload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityName, setActivityName] = useState([]);
  const [searchTxt, setSearchTxt] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedName, setFilteredName] = useState(null);
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const accessToken = JSON.parse(token);
    setPayload(accessToken);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (payload) {
        setLoading(true);
        await getAthleteActivities(payload, 100, pageIndex).then((response) => {
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

  return (
    <>
      <br></br>
      {/* wire up search filter to display output */}
      <Search searchTxt={searchTxt} updateSearchTxt={setSearchTxt} />
      <DropDown setFilteredName={setFilteredName} result={activities} />
      <Pagination
        pageIndex={pageIndex}
        onPageChange={(currentPage) => setPageIndex(currentPage)}
      />

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
