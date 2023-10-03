import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
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
import ActivityDropDown from '../components/ActivityDropDown';
import Login from '../components/Login';
import Search from '../components/search';
import TimeRangeCalendar from '../components/TimeRangeCalendar';
import '../App.css';
import { Link } from 'react-router-dom';
import AthleteStats from '../components/AthleteStats';

const initialState = {
  activities: [],
  loading: false,
  activityLoadingState: null,
};

const AthleteActivities = () => {
  const { windowWidth } = useGetWindowWidth();
  const { isVisible, scrollToTop } = useScroll();
  const [filteredSportType, setFilteredSportType] = useState(null);
  const [searchTxt, setSearchTxt] = useState('');
  const [state, setState] = useState(initialState);
  const access_token = JSON.parse(localStorage.getItem('access_token'));

  useEffect(() => {
    const payload = JSON.parse(localStorage.getItem('access_token'));
    if (payload) {
      getUsersDetails(payload);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      const data = JSON.parse(localStorage.getItem('activities'));
      if (data !== null && data !== undefined) {
        setState((prevState) => ({
          ...prevState,
          loading: false,
        }));
        return;
      }

      setState((prevState) => ({ ...prevState, loading: true }));
      let stravaActivityResponse = await fetchStravaActivities(access_token);
      setState((prevState) => ({
        ...prevState,
        activities: stravaActivityResponse,
        loading: false,
      }));
      localStorage.setItem('activities', JSON.stringify(stravaActivityResponse));
    }

    catchErrors(fetchData());
  }, [access_token]);

  useEffect(() => {
    const data = localStorage.getItem('activities');
    if (data !== null && data !== undefined) {
      setState((prevState) => ({
        ...prevState,
        activities: JSON.parse(data),
      }));
    }
  }, []);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const expires_at = localStorage.getItem('expires_at');
        const expires_in = localStorage.getItem('expires_in');
        if (expires_at && expires_in) {
          checkIfTokenExpired(expires_in, expires_at);
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
    };

    fetchTokenInfo();
  }, []);

  const fetchStravaActivities = async (accessToken) => {
    let stravaActivityResponse = [];
    let looper_num = 1;

    while (looper_num || stravaActivityResponse.length === 0) {
      const stravaActivityResponseSingle = await getAthleteActivities(
        accessToken,
        200,
        looper_num
      );

      if (
        !stravaActivityResponseSingle.data ||
        stravaActivityResponseSingle.data.length === 0 ||
        stravaActivityResponseSingle.data.errors
      ) {
        setState((prevState) => ({
          ...prevState,
          loading: false,
        }));
        break;
      } else {
        setState((prevState) => ({
          ...prevState,
          activityLoadingState: stravaActivityResponse.length,
        }));
        stravaActivityResponse = stravaActivityResponse.concat(
          stravaActivityResponseSingle.data
        );
      }
      looper_num++;
    }

    return stravaActivityResponse;
  };
  let filteredActivities = state.activities;
  if (searchTxt) {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.name.toLowerCase().includes(searchTxt.toLowerCase());
    });
  }

  if (filteredSportType) {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.sport_type === filteredSportType;
    });
  }

  if (state.loading && access_token) {
    return (
      <div>
        <h1 style={{ color: 'red', textAlign: 'center' }}>
          <div className={LoadingWheel.loading} style={{ color: 'darkorange' }}>
            ...
          </div>
          Please Wait. Loading {state.activityLoadingState} activities......
        </h1>
      </div>
    );
  }

  return (
    <>
      {!access_token ? (
        <Login />
      ) : (
        <>
          {isVisible && <ScrollToTop alt="Go to top" onClick={scrollToTop} />}
          {windowWidth >= 700 && (
            <>
              <Search
                searchTxt={searchTxt}
                updateSearchTxt={setSearchTxt}
                placeholder={'Search All Activities'}
              />
            </>
          )}
          <AthleteStats />
          <TimeRangeCalendar props={state.activities} />

          <SideNavigation>
            <ActivityDropDown
              props={state.activities}
              setFilterBySportType={setFilteredSportType}
            />
            <div>
              {filteredActivities.map((activity, i) => (
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
          {windowWidth < 700 && (
            <>
              <ActivityDropDown
                props={state.activities}
                setFilterBySportType={setFilteredSportType}
              />
              <Search
                searchTxt={searchTxt}
                updateSearchTxt={setSearchTxt}
                placeholder={'Search All Activities'}
              />
            </>
          )}

          <CardDetails>
            {filteredActivities
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
                        <div key={i} style={{ textAlign: 'center' }}>
                          <ActivityName>{activity?.name}</ActivityName>
                          <p>{getKmsToMiles(activity?.distance)} miles</p>
                          <p>{getSecondstoMinutes(activity?.moving_time)} </p>
                          <p>Date: {formattedDate(activity?.start_date)}</p>
                          <p>kudos: {activity?.kudos_count}</p>
                        </div>
                      </Cardborder>
                    </div>
                  )}
                </>
              ))
              .slice(0, 20)}
          </CardDetails>
        </>
      )}
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

  @media screen and (max-width: 830px) {
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
  font-family: 'Roboto', sans-serif;
  text-align: left;

  @media screen and (max-width: 800px) {
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
  margin: 0.5rem;
  margin-left: 3rem;
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

  @media screen and (max-width: 750px) {
    width: calc((100% - 3rem));
    margin-left: 1rem;
  }
`;

const Text = styled.div`
  font-size: 0.75rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;

  @media screen and (max-width: 750px) {
    font-size: 0.7rem;
    justify-content: space-evenly;
  }
`;
const ActivityName = styled.h2`
  font-size: 1rem;
  display: flex;
  flex-direction: row;
  margin: 15px 0px 0 0px; // top right bottom left
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

  @media screen and (max-width: 750px) {
    width: 1em;
    height: 2em;
  }
`;

const StopWatchIcon = styled(Stopwatch)`
  margin: 0px 5px 0px 0px;
  width: 2em;
  width: 2em;
  color: ${(props) => props.theme.colour.strava};

  @media screen and (max-width: 750px) {
    width: 1em;
    height: 2em;
  }
`;

const ThumbUpIcon = styled(HandThumbsUpFill)`
  margin: 0px 5px 0px 0px;
  width: 2em;
  height: 2em;
  color: ${(props) => props.theme.colour.strava};

  @media screen and (max-width: 750px) {
    width: 1em;
    height: 2em;
  }
`;

const CalendarIcon = styled(CalendarDateFill)`
  margin: 0px 10px 0px 0px;
  width: 2em;
  height: 2em;
  color: ${(props) => props.theme.colour.strava};

  @media screen and (max-width: 750px) {
    width: 1em;
    height: 2em;
  }
`;
export default AthleteActivities;
