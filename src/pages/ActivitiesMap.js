import React, { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { getAthleteActivities } from '../utils/functions';
import { catchErrors } from '../utils/helpers';
import { formattedDate } from '../utils/conversion';
import ActivityDropDown from '../components/ActivityDropDown';
import Login from '../components/Login';
import styled from 'styled-components';
import SearchBar from '../components/search';
import Layers from '../components/layers';
import { removeDataAfterDuration } from '../utils/helpers';
import { useGetWindowWidth, useScroll } from '../utils/hooks';
import LoadingWheel from '../styles/Loading.module.css';
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  LayersControl,
  Polyline,
  Popup,
} from 'react-leaflet';

const initialState = {
  nodes: [],
  loading: false,
  activityLoadingState: null,
};

const ActivitiesMap = () => {
  const [searchTxt, setSearchTxt] = useState('');
  const [state, setState] = useState(initialState);
  const { windowWidth } = useGetWindowWidth();
  const { isVisible, scrollToTop } = useScroll();
  const [filteredSportType, setFilteredSportType] = useState(null);
  const expires_in = localStorage.getItem('expires_in');
  let access_token = JSON.parse(localStorage.getItem('access_token'));

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      loading: true,
    }));

    async function fetchData() {
      const data = JSON.parse(localStorage.getItem('activities'));
      let polylines = [];
      removeDataAfterDuration('activities', 6);
      if (data) {
        polylines = getDataPolylines(data);
        setState((prevState) => ({
          ...prevState,
          loading: false,
        }));
        setState((prevState) => ({
          ...prevState,
          nodes: polylines,
        }));
      } else if (data === null && access_token) {
        const stravaActivityResponse = await fetchStravaActivities(access_token);
        polylines = getDataPolylines(stravaActivityResponse);
        localStorage.setItem('activities', JSON.stringify(stravaActivityResponse));
        setState((prevState) => ({
          ...prevState,
          loading: false,
        }));
        setState((prevState) => ({
          ...prevState,
          nodes: polylines,
        }));
      }
    }

    catchErrors(fetchData());
    // eslint-disable-next-line
  }, []);

  const getDataPolylines = (activities) => {
    return activities.map((activity) => ({
      activityPositions: polyline.decode(activity.map.summary_polyline),
      activityName: activity.name,
      activityDate: formattedDate(activity.start_date_local),
      activityType: activity.type,
      activityId: activity.id,
    }));
  };

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

  let filteredName = state.nodes.filter((activity) => {
    return activity.activityName.toLowerCase().includes(searchTxt.toLowerCase());
  });

  if (filteredSportType) {
    filteredName = filteredName.filter((activity) => {
      return activity.activityType === filteredSportType;
    });
  }

  if (state.loading && access_token) {
    return (
      <div>
        <h1 style={{ color: 'red', textAlign: 'center' }}>
          <div className={LoadingWheel.loading} style={{ color: 'darkorange' }}>
            ...
          </div>
          Wait. Loading {state.activityLoadingState} activities......
        </h1>
      </div>
    );
  }

  return (
    <>
      {!access_token || expires_in === 0 ? (
        <Login />
      ) : (
        <>
          <SideNavigation>
            <ActivityDropDown
              props={state.nodes}
              setFilterBySportType={setFilteredSportType}
            />
            {isVisible && (
              <div onClick={scrollToTop}>
                <ScrollToTop alt="Go to top"></ScrollToTop>
              </div>
            )}
            <input
              className="search__input"
              type="text"
              placeholder="Search by activity name..."
              aria-label="Search"
              onChange={(e) => setSearchTxt(e.target.value)}
            />

            {filteredName &&
              filteredName.map((activity, i) => (
                <a
                  href={`https://www.strava.com/activities/${activity.activityId}`}
                  target="_blank"
                  rel="noreferrer"
                  key={i}
                >
                  {activity.activityDate + ' '}
                  {activity.activityName + ' '}
                  {activity.activityType + ' '}
                </a>
              ))}
          </SideNavigation>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '600px',
            }}
          >
            {windowWidth < 785 && (
              <>
                <ActivityDropDown
                  props={state.nodes}
                  setFilterBySportType={setFilteredSportType}
                />
                <SearchBar
                  searchTxt={searchTxt}
                  updateSearchTxt={setSearchTxt}
                  width={'75%'}
                  fontSize="1rem"
                  placeholder="Search by activity name..."
                />
              </>
            )}

            <MapContainer
              style={{ height: '100vh', width: '100vw', zIndex: 0 }}
              center={[55.89107, -3.21698]}
              zoom={7}
              zoomControl={false}
              bounds={state.nodes.map((node) => node.activityPositions)}
              boundsOptions={{ padding: [50, 50] }}
              maxBoundsViscosity={0}
              scrollWheelZoom={true}
            >
              <LayersControl position="topright" collapsed={false}>
                {Layers.map((layer, index) => {
                  return (
                    <LayersControl.BaseLayer
                      key={index}
                      checked={index === 0 ? true : false}
                      name={layer.name}
                    >
                      <TileLayer attribution={layer.attribution} url={layer.url} />
                    </LayersControl.BaseLayer>
                  );
                })}

                {filteredName &&
                  filteredName.map((activity, i) => (
                    <div>
                      <FeatureGroup>
                        <Polyline
                          positions={activity.activityPositions}
                          key={i}
                          weight={3}
                          color={activity.activityType === 'Run' ? 'red' : 'blue'}
                          smoothFactor={0.7}
                          vectorEffect="non-scaling-stroke"
                          opacity={0.5}
                          zoom={12}
                        />
                        <Popup>
                          {activity.activityName + ' ' + activity.activityDate}{' '}
                          <a
                            href={`https://www.strava.com/activities/${activity.activityId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on Strava
                          </a>
                        </Popup>
                      </FeatureGroup>
                    </div>
                  ))}
              </LayersControl>
            </MapContainer>
          </div>
        </>
      )}
    </>
  );
};
export default ActivitiesMap;

const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  color: ${(props) => props.theme.colour.strava};
  display: flex;
  z-index: 1100;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  margin: 0px 10px 40px 90vw;
`;

const SideNavigation = styled.div`
  height: 100%;
  margin-top: 50px;
  width: 230px;
  display: block;
  position: fixed;
  z-index: 1;
  top: 2em;
  left: 0;
  scroll-behavior: smooth;
  overflow-y: scroll;
  padding-top: 20px;
  background-color: #111;
  opacity: 0.8;
  color: white;

  @media screen and (max-width: 785px) {
    display: none;
  }

  .search__input {
    width: 90%;
    height: 20px;
    font-size: 1rem;
    display: inline-block;
    margin: 0px 0px 0px 5px;
    margin-bottom: 0.5em;
    border-radius: 0.5em;
    margin-top: 10px;
    border: 1px solid white;
    padding: 5px;
    outline: none;
  }

  .search__input:focus {
    border: 1px solid red;
  }
  .search__input::placeholder {
    color: gray;
    align-items: center;
  }

  .screenshot__button {
    margin-left: 1.5vw;
    margin-top: 3px;
    margin-bottom: 10px;
    color: red;
    font-size: 0.9rem;
    font-weight: bold;
    background-color: ghostwhite;
    border: 2px solid white;
    border-radius: 10px;
    width: 175px;
    height: 30px;
  }

  .screenshot__button:hover {
    background-color: red;
    color: white;
    border: 2px solid red;
  }
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
    padding: 5px 3px 3px 20px;
    line-break: 2px;
    margin-top: 2px;
    text-decoration: none;
    font-size: 12px;
    color: white;
    display: block;
  }

  a:hover {
    color: white;
    text-decoration: underline;
  }
`;
