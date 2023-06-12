import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { mediaQueries } from '../utils/mediaQueries';
import { getAthleteActivities, getDetailedAthleteData } from '../utils/functions';
import { getNewAccessToken } from '../utils/helpers';
import { catchErrors } from '../utils/helpers';
import LoadingWheel from '../styles/Loading.module.css';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { getKmsToMiles, getSecondstoMinutes, formattedDate } from '../utils/conversion';
import polyline from '@mapbox/polyline';
import Login from './Login';
import AthleteProfile from './Profile';
import Search from '../utils/search';
import '../App.css';
import { Link } from 'react-router-dom';
import AthleteStats from './AthleteStats';

const AthleteActivities = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [payload, setPayload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activityName, setActivityName] = useState([]);
  const [searchTxt, setSearchTxt] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([]);

  const mapboxApiUrl =
    'https://api.mapbox.com/styles/v1/mapbox/light-v10/static/path-3+ff0000(kdfuIvujRADDNX`@N^b@l@^p@VZ~@~AZb@z@v@Zl@PNp@z@J@^Mh@GKXQvAW^CxA]b@Gr@Ud@E`@MzAKn@MTAf@L^Br@JZNh@Lr@ZVRVf@Hf@BhCH`AXfBTbA^nAPtA@l@AzAIdCClCAJM`@u@vA_@x@g@hB_@jAg@lBWr@e@n@IFII?z@Lz@TbARn@v@hDt@vDHl@jAp@rDv@nDHn@\fBXnBRnAv@bGXrBRlAl@xC`@zAZxAp@bEl@zCRpAr@vCPtAX|Ap@~CVz@Ff@ZrAtAbHXbAV~A`@tBd@zBbA~Dx@vD|@zCj@|BRbAhBjGvA`E@VM~BEXs@lBa@x@o@`BOVMDG?EEM_@mAqGY{@YsA_aDMkBKw@a@{AQu@YuCs@wDMmAKiBKm@Y{CM}@UaCu@{DIq@WsAU{AIaAqAyHQeB]wBa@wBm@{BKo@AON_AFUZa@Pi@r@aC^eB`@yAs@VY^]JOHU@UCwBFcB?_EGk@i@aCEk@[{AMqAK_CEYUi@QU_Ak@]EIEs@OeAMOEs@AaAHo@NaBRSHIHUDYHU?UFGAMHU@EJKFe@D}@NSF}BZME[YcBeCe@g@kAkBa@w@eA_Bc@i@USMBm@|@YTmAVi@?y@JK@AA)/auto/400x200?access_token=pk.eyJ1IjoiZGptZjIwMTUiLCJhIjoiY2xoZW5qbjN6MDBnNzNydGUzZzByd201ZiJ9._GLfwhRi2H3__7Hb1ZQAow';
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

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (payload) {
        const response = await getAthleteActivities(payload, 200, pageIndex); // fetch data from strava api
        if (response.data.length === 0) {
          localStorage.setItem('activities', JSON.stringify(activities));
          return;
        }
        const newData = response.data || [];
        setActivities((prevItems) => [...prevItems, ...newData]);
      }
      setPageIndex((prevPage) => prevPage + 1); // increment page index
    } catch (error) {
      catchErrors(error);
    } finally {
      setLoading(false);
    }
  }, [payload, pageIndex]);

  useEffect(() => {
    const data = localStorage.getItem('activities'); // get data from local storage
    if (data !== null && data !== undefined) {
      setActivities(JSON.parse(data));
    } else {
      catchErrors(fetchData());
    }
  }, [fetchData]);

  useEffect(() => {
    async function checkIfTokenExpired() {
      const expires_at = localStorage.getItem('expires_at');
      const expires_in = localStorage.getItem('expires_in');
      if (expires_in && expires_at) {
        const timeElapsed = Date.now() - expires_at;
        if (timeElapsed / 1000 > expires_in) {
          const res = await getNewAccessToken();
          // navigate('/login');
        }
      }
    }
    checkIfTokenExpired();
  });

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
          activityPositions: polyline.toGeoJSON(activity_polyline),
          activityName: activityName,
        });
      }
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

  if (!activities || loading)
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
      {!payload ? <Login /> : <>{/* <AthleteProfile /> */}</>}

      {isVisible && (
        <div onClick={scrollToTop}>
          <ScrollToTop alt="Go to top"></ScrollToTop>
        </div>
      )}
      <SideNavigation>
        <Search
          searchTxt={searchTxt}
          updateSearchTxt={setSearchTxt}
          placeholder="search activities..."
        />
        <div>
          {filteredName.map((activity, i) => (
            <>
              {activity.map?.summary_polyline ? (
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
      {/* <AthleteStats /> */}
      <CardDetails>
        {filteredName.map((activity, i) => (
          <>
            {activity.map?.summary_polyline ? (
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

  /* media queries here */

  @media screen and (max-width: 600px) {
    display: none;
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

  @media screen and (max-width: 600px) {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    margin-left: 50px;
  }
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
