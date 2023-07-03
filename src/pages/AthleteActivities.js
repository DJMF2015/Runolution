import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import '../styles/AthleteStyles.css';
import { getAthleteActivities, getUsersDetails } from '../utils/functions';
import { useGetWindowWidth, useScroll } from '../utils/hooks';
import { catchErrors, checkIfTokenExpired } from '../utils/helpers';
import LoadingWheel from '../styles/Loading.module.css';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { HandThumbsUpFill } from '@styled-icons/bootstrap/HandThumbsUpFill';
import { CalendarDateFill } from '@styled-icons/bootstrap/CalendarDateFill';
import { Activity } from '@styled-icons/evaicons-solid/Activity';
import { Stopwatch } from '@styled-icons/boxicons-regular/Stopwatch';
import { getKmsToMiles, getSecondstoMinutes, formattedDate } from '../utils/conversion';
import polyline from '@mapbox/polyline';
import Login from './Login';
import Search from '../utils/search';
import '../App.css';
import { Link } from 'react-router-dom';
import AthleteStats from './AthleteStats';

const AthleteActivities = () => {
  const [payload, setPayload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityName, setActivityName] = useState([]);
  const [searchTxt, setSearchTxt] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([]);
  const { windowWidth } = useGetWindowWidth();
  const { isVisible, scrollToTop } = useScroll();
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const accessToken = JSON.parse(token);
    setPayload(accessToken);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const user = await getUsersDetails(payload);
    }
    if (payload) {
      fetchData();
    }
  }, [payload]);

  const fetchData = async (pageIndex) => {
    setLoading(true);
    try {
      if (payload) {
        const response = await getAthleteActivities(payload, 200, pageIndex); // fetch data from Strava API
        if (response.data.length === 0) {
          localStorage.setItem('activities', JSON.stringify(activities));
          return;
        }
        const newData = response.data || [];
        setActivities((prevItems) => [...prevItems, ...newData]);
        setPageIndex((prevPage) => prevPage + 1); // increment page index
      }
    } catch (error) {
      catchErrors(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const expires_at = localStorage.getItem('expires_at');
    const expires_in = localStorage.getItem('expires_in');
    const fetchTokenInfo = async () => {
      try {
        if (expires_at && expires_in) {
          checkIfTokenExpired(expires_in, expires_at);
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
    };

    fetchTokenInfo();
  }, []);

  useEffect(() => {
    const data = localStorage.getItem('activities'); // get data from local storage
    if (data !== null && data !== undefined) {
      setActivities(JSON.parse(data));
    } else {
      fetchData(pageIndex);
    }
  }, [payload, pageIndex]);

  useEffect(() => {
    if (activities.length > 0) {
      setLoading(true);
      const stravaActivityResponse = activities;
      let polylines = [];
      for (let i in stravaActivityResponse) {
        const activityName = stravaActivityResponse[i]?.name;
        let activity_polyline = stravaActivityResponse?.[i]?.map?.summary_polyline;
        if (stravaActivityResponse === undefined || stravaActivityResponse === null) {
          setLoading(false);
        }
        setActivityName(activityName);
        polylines.push({
          activityPositions: polyline.toGeoJSON(activity_polyline),
          activityName: activityName,
        });
      }
      setNodes(polylines);
      setLoading(false);
    }
  }, [activities]);

  const filteredName = activities.filter((activity) => {
    return activity.name.toLowerCase().includes(searchTxt.toLowerCase());
  });

  if (loading)
    return (
      <div style={{ body: 'black' }}>
        <h1 style={{ color: 'red', textAlign: 'center' }}>
          Loading...
          <div className={LoadingWheel.loading}>...</div>
        </h1>
      </div>
    );

  return (
    <>
      {!payload && <Login />}

      {isVisible && (
        <div onClick={scrollToTop}>
          <ScrollToTop alt="Go to top"></ScrollToTop>
        </div>
      )}
      {windowWidth >= 600 && (
        <Search
          searchTxt={searchTxt}
          updateSearchTxt={setSearchTxt}
          placeholder="search activities..."
        />
      )}
      <AthleteStats />
      <SideNavigation>
        <div>
          {filteredName.map((activity, i) => (
            <>
              {activity.map?.summary_polyline ? (
                <div key={activity.id}>
                  <Link
                    to="/activity"
                    state={{ from: activity }}
                    key={`${activity.id}--${activity.moving_time}--${activity.average_heartrate}`}
                  >
                    <h2>
                      {i + 1}. {activity.name}
                    </h2>
                  </Link>
                </div>
              ) : (
                <div key={i}>
                  <h3>
                    {i + 1}. {activity?.name}
                  </h3>
                </div>
              )}
            </>
          ))}
        </div>
      </SideNavigation>
      {windowWidth < 600 && (
        <Search
          searchTxt={searchTxt}
          updateSearchTxt={setSearchTxt}
          placeholder={'Search Activities'}
        />
      )}

      <CardDetails>
        {filteredName
          .map((activity, i) => (
            <>
              {activity.map?.summary_polyline ? (
                <Cardborder>
                  <div key={i}>
                    <Link
                      style={{ textDecoration: 'none' }}
                      to="/activity"
                      state={{ from: activity }}
                      key={`${activity.id}--${activity.moving_time}--${activity.average_heartrate}`}
                    >
                      <ActivityName>{activity.name}</ActivityName>
                    </Link>
                    <Text>
                      <p>
                        <ActivityIcon /> Distance: {getKmsToMiles(activity.distance)}
                      </p>
                      <p>
                        <StopWatchIcon />
                        Time: {getSecondstoMinutes(activity.moving_time)}{' '}
                      </p>
                      <p>
                        {' '}
                        <CalendarIcon />
                        {formattedDate(activity.start_date)}
                      </p>
                      <p>
                        {' '}
                        <ThumbUpIcon /> kudos: {activity.kudos_count}{' '}
                      </p>
                    </Text>
                  </div>
                </Cardborder>
              ) : (
                <div key={i}>
                  <Cardborder>
                    <div key={i}>
                      <h2>{activity?.name}</h2>
                      <p>{getKmsToMiles(activity?.distance)}</p>
                      <p>{getSecondstoMinutes(activity?.moving_time)} </p>
                      <p>Date: {formattedDate(activity?.start_date)}</p>
                      <p>kudos: {activity?.kudos_count}</p>
                    </div>
                  </Cardborder>
                </div>
              )}
            </>
          ))
          .slice(0, pageIndex + 10)}
      </CardDetails>
    </>
  );
};
// sidenavigation bar for search and pagination
const SideNavigation = styled.div`
  height: 100%;
  width: 240px;
  font-size: 0.8rem;
  position: fixed;
  padding: 10px;
  display: block;
  position: fixed;
  z-index: 1000;
  top: calc(10% - 5px);
  left: 0;
  scroll-behavior: smooth;
  padding-top: 20px;
  overflow: auto;
  background-color: #111;
  opacity: 0.8;
  color: white;

  /* customise scrollbar for modern browser except firefox*/
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px grey;
    border-radius: 10px;
  }
  ::-webkit-scollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:window-inactive {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:horizontal {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:vertical {
    background-color: #555;
  }

  a {
    padding: 2px 0px 0px 15px;
    line-break: 2px;
    margin-top: 2px;
    text-decoration: none;
    font-size: 10px;
    color: white;
    display: block;
  }

  a:hover {
    color: white;
    text-decoration: underline;
  }

  /* media queries here */

  @media screen and (max-width: 600px) {
    display: none;
  }
`;

const CardDetails = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  margin-left: 250px;
  justify-content: center;
  position: relative;
  background-color: #fff;
  /* z-index: */
  font-family: 'Roboto', sans-serif;
  text-align: left;

  @media screen and (max-width: 600px) {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    margin-left: 50px;
    background-color: #fff;
  }
`;

const Cardborder = styled.div`
  border: 2px solid #111;
  border-radius: 5px;
  box-sizing: border-box;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  padding: 0rem;
  margin: 1rem;
  margin-left: 3rem;
  width: calc((100% - 7rem));
  text-align: left;
  background-color: white;
  color: #333;
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.7;
  transition: all 0.3s ease-in-out;

  &:hover {
    box-shadow: 0 0 10px white;
    transform: scale(1.05);
    opacity: 1;
    /* make card fade as scroll out of view */
  }
`;

const Text = styled.div`
  font-size: 0.75rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
`;
const ActivityName = styled.h2`
  font-size: 1rem;
  display: flex;
  flex-direction: row;
  margin: 15px 0 0 0; // top right bottom left
  text-align: center;
  justify-content: center;
  color: ${(props) => props.theme.colour.strava};
  text-decoration: none;
`;
const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  color: ${(props) => props.theme.colour.strava};
  display: flex;
  z-index: 1;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  margin: 0px 10px 40px 90vw;
`;

const ActivityIcon = styled(Activity)`
  height: 2.5em;
  width: 2.5em;
  color: ${(props) => props.theme.colour.strava};
  margin: 0px 5px 0px 0px;
`;

const StopWatchIcon = styled(Stopwatch)`
  margin: 0px 5px 0px 0px;
  width: 2em;
  width: 2em;
  color: ${(props) => props.theme.colour.strava};
`;

const ThumbUpIcon = styled(HandThumbsUpFill)`
  margin: 0px 5px 0px 0px;
  width: 2em;
  height: 2em;
  color: ${(props) => props.theme.colour.strava};
`;

const CalendarIcon = styled(CalendarDateFill)`
  margin: 0px 10px 0px 0px;
  width: 2em;
  height: 2em;
  color: ${(props) => props.theme.colour.strava};
`;
export default AthleteActivities;
