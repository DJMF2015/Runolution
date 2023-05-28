import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { mediaQueries } from '../utils/mediaQueries';
import { getAthleteActivities } from '../utils/functions';
import Pagination from '../utils/pagination';
import axios from 'axios';
import { catchErrors } from '../utils/helpers';
import LoadingWheel from '../styles/Loading.module.css';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { getKmsToMiles, getSecondstoMinutes, formattedDate } from '../utils/conversion';
import polyline from '@mapbox/polyline';
import Login from './Login';
import Profile from './AthleteStats';
import Navbar from '../components/MobileNav';
import Search from '../utils/search';
import '../App.css';
import { Link } from 'react-router-dom';

const AthleteActivities = () => {
  const [payload, setPayload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activityName, setActivityName] = useState([]);
  const [searchTxt, setSearchTxt] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalpages, setTotalPages] = useState(0);
  const [nodes, setNodes] = useState([]);
  const [isSelected, setIsSelected] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const accessToken = JSON.parse(token);
    setPayload(accessToken);
  }, []);

  // useEffect(() => {
  //   async function fetchData() {
  //     if (payload && pageIndex) {
  //       setLoading(true);
  //       await getAthleteActivities(payload, 150, pageIndex).then((response) => {
  //         setActivities(response.data);
  //       });
  //     }
  //   }
  //   catchErrors(fetchData());
  // }, [payload, pageIndex]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (payload && pageIndex) {
        const response = await getAthleteActivities(payload, 150, pageIndex); // fetch data from strava api
        const newData = response.data || []; // get data from response
        setActivities((prevItems) => [...prevItems, ...newData]); // append new data to old data array in state variable
      }
      setPageIndex((prevPage) => prevPage + 1); // increment page index
    } catch (error) {
      catchErrors(error); // catch errors
    } finally {
      setLoading(false);
    }
  }, [payload, pageIndex]);
  // // useeffect to fetch data from strava api but prevent infinite loop
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      const stravaActivityResponse = activities;
      let polylines = [];
      for (let i in stravaActivityResponse) {
        const activityName = stravaActivityResponse[i]?.name;
        let activity_polyline = stravaActivityResponse?.[i]?.map?.summary_polyline;
        if (
          !activities ||
          stravaActivityResponse === undefined ||
          stravaActivityResponse === null
        ) {
          setLoading(false);
        }
        setActivityName(activityName);
        polylines.push({
          activityPositions: polyline.decode(activity_polyline),
          activityName: activityName,
        });
      }
      setTotalPages(activities.length);
      setNodes(polylines);
      setLoading(false);
    }
    catchErrors(fetchData());
  }, [activities]);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };
  // for infinite scrolling of activities
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop !==
        document.documentElement.offsetHeight || //
      loading
    ) {
      return;
    }
    fetchData();
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading]);
  // Set top coordinate to 0
  // for smooth scrolling
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
  }, []);

  const filteredName = activities.filter((activity) => {
    return activity.name.toLowerCase().includes(searchTxt.toLowerCase());
  });

  if (loading && activities.length !== 0)
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
      {!payload ? (
        <Login />
      ) : (
        <>
          <Navbar />
          <Profile />
        </>
      )}
      {/* <Pagination
        totalPages={totalpages}
        pageIndex={pageIndex}
        onPageChange={(currentPage) => setPageIndex(currentPage)}
      /> */}
      {isVisible && (
        <div onClick={scrollToTop}>
          <ScrollToTop alt="Go to top"></ScrollToTop>
        </div>
      )}
      <SideNavigation>
        {/* <button onClick={fetchData}>Load More</button> */}

        <Search searchTxt={searchTxt} updateSearchTxt={setSearchTxt} />

        {filteredName.map((activity, i) => (
          <>
            <div key={i}>
              <Link
                style={{ color: 'white' }}
                to="/testcard"
                state={{ from: activity }}
                key={`${activity.id}--${activity.moving_time}--${activity.average_heartrate}`}
              >
                <h2>
                  {i + 1}. {activity.name}
                </h2>
              </Link>
            </div>
          </>
        ))}
      </SideNavigation>

      <CardDetails>
        {filteredName.map((activity, i) => (
          <>
            <Cardborder>
              <div key={i}>
                <Link
                  to="/testcard"
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
    </>
  );
};
// sidenavigation bar for search and pagination
const SideNavigation = styled.div`
  height: 100%;
  width: 250px;
  font-size: 0.8rem;
  padding: 10px;
  display: block;
  position: fixed;
  border-right: 3px solid grey;
  z-index: 1000;
  top: 0;
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
`;

const CardDetails = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-left: 250px;
  justify-content: center;
  /* max-width: 59vw; */
  /* margin-top: -20px; */
  background-color: ghostwhite;
  position: relative;
  font-family: 'Roboto', sans-serif;
`;

const Cardborder = styled.div`
  border: 2px solid #fff;
  border-radius: 5px;
  box-sizing: border-box;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  padding: 2rem;
  margin: 2rem;
  width: 400px;
  height: 300px;
  font-family: comic sans ms;
  background-color: #fff;
  color: #333;
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
  opacity: 0.5;
  transition: all 0.3s ease-in-out;

  &:hover {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    transform: scale(1.05);
    opacity: 1;
    /* make card fade as scroll out of view */
  }
`;

const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  display: flex;
  z-index: 1;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  margin: 0px 10px 40px 95vw;
`;

export default AthleteActivities;
