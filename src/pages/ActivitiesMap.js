import React, { useState, useEffect, useMemo, useRef } from 'react';
import polyline from '@mapbox/polyline';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { getAthleteActivities } from '../utils/functions';
import { catchErrors } from '../utils/helpers';
import { formattedDate } from '../utils/conversion';
import ActivityDropDown from '../components/ActivityDropDown';
import addActivitiesLayers from '../components/MapActivityLayers';
import Login from '../components/Login';
import styled from 'styled-components';
import { removeDataAfterDuration } from '../utils/helpers';
import { useGetWindowWidth, useScroll } from '../utils/hooks';
import LoadingWheel from '../styles/Loading.module.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const initialState = {
  nodes: [],
  loading: false,
  activityLoadingState: null,
};

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
};

const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

const DEFAULT_MAP_CENTER = [-3.21698, 55.89107];
const DEFAULT_MAP_ZOOM = 10;
const MIN_ACTIVITY_ZOOM = 8;
const MAX_ACTIVITY_ZOOM = 13;

const getBoundsForMostCoordinates = (coordinates) => {
  if (coordinates.length === 0) {
    return null;
  }
};

const ActivitiesMap = () => {
  const [searchTxt, setSearchTxt] = useState('');
  const [state, setState] = useState(initialState);
  const { windowWidth } = useGetWindowWidth();
  const { isVisible, scrollToTop } = useScroll();
  const [filteredSportType, setFilteredSportType] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const routeFeatureCollectionRef = useRef(EMPTY_FEATURE_COLLECTION);
  const currentMapStyleRef = useRef('street');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState('street');
  const expires_in = localStorage.getItem('expires_in');
  const mapboxAccessToken = process.env.REACT_APP_MAPBOX_KEY;
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
    return activities
      .filter((activity) => activity?.map?.summary_polyline)
      .map((activity) => {
        const activityPositions = polyline.decode(activity.map.summary_polyline);
        return {
          activityPositions,
          activityCoordinates: activityPositions.map(([lat, lng]) => [lng, lat]),
          activityName: activity.name,
          activityDate: formattedDate(activity.start_date_local),
          activityType: activity.type || activity.sport_type,
          activityId: activity.id,
        };
      })
      .filter((activity) => activity.activityCoordinates.length > 1);
  };

  const fetchStravaActivities = async (accessToken) => {
    let stravaActivityResponse = [];
    let looper_num = 1;

    while (looper_num || stravaActivityResponse.length === 0) {
      const stravaActivityResponseSingle = await getAthleteActivities(
        accessToken,
        200,
        looper_num,
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
        const loadedActivityCount = stravaActivityResponse.length;
        setState((prevState) => ({
          ...prevState,
          activityLoadingState: loadedActivityCount,
        }));
        stravaActivityResponse = stravaActivityResponse.concat(
          stravaActivityResponseSingle.data,
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

  const routeFeatureCollection = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: filteredName.map((activity) => ({
        type: 'Feature',
        properties: {
          activityId: activity.activityId,
          activityName: activity.activityName,
          activityDate: activity.activityDate,
          activityType: activity.activityType,
        },
        geometry: {
          type: 'LineString',
          coordinates: activity.activityCoordinates,
        },
      })),
    };
  }, [filteredName]);

  useEffect(() => {
    routeFeatureCollectionRef.current = routeFeatureCollection;
  }, [routeFeatureCollection]);

  useEffect(() => {
    if (!access_token || !mapboxAccessToken || !mapContainer.current || mapRef.current) {
      return;
    }
    const onlineStatus = navigator.onLine;
    if (!onlineStatus) {
      setIsOffline(true);
    }
    mapboxgl.accessToken = mapboxAccessToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES.street,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: true,
      projection: 'mercator',
    });

    mapRef.current = map;
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '280px',
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.on('style.load', () => {
      addActivitiesLayers(map);
      const source = map.getSource('activities');
      if (source) {
        source.setData(routeFeatureCollectionRef.current);
      }
    });

    map.on('load', () => {
      map.on('mouseenter', 'activities-lines', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'activities-lines', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'activities-lines', (event) => {
        const feature = event.features?.[0];
        const coordinates = event.lngLat;
        if (!feature || !popupRef.current) {
          return;
        }

        const { activityId, activityName, activityDate, activityType } =
          feature.properties;

        const popupContent = document.createElement('div');
        const popupTitle = document.createElement('strong');
        const popupMeta = document.createElement('div');
        const popupLink = document.createElement('a');

        popupTitle.textContent = activityName;
        popupMeta.textContent = `${activityDate} ${activityType}`;
        popupLink.href = `https://www.strava.com/activities/${activityId}`;
        popupLink.target = '_blank';
        popupLink.rel = 'noreferrer';
        popupLink.textContent = 'View on Strava';

        popupContent.appendChild(popupTitle);
        popupContent.appendChild(document.createElement('br'));
        popupContent.appendChild(popupMeta);
        popupContent.appendChild(popupLink);

        popupRef.current.setLngLat(coordinates).setDOMContent(popupContent).addTo(map);
      });

      setIsMapLoaded(true);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
      setIsMapLoaded(false);
    };
  }, [access_token, mapboxAccessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !MAP_STYLES[mapStyle]) {
      return;
    }

    if (currentMapStyleRef.current === mapStyle) {
      return;
    }

    currentMapStyleRef.current = mapStyle;
    map.setStyle(MAP_STYLES[mapStyle]);
  }, [isMapLoaded, mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) {
      return;
    }

    const source = map.getSource('activities');
    if (source) {
      source.setData(routeFeatureCollection);
    }

    const coordinates = routeFeatureCollection.features.flatMap((feature) => {
      return feature.geometry.coordinates;
    });

    if (coordinates.length === 0) {
      return;
    }

    const bounds = getBoundsForMostCoordinates(coordinates);
    if (!bounds) {
      return;
    }

    const camera = map.cameraForBounds(bounds, {
      padding: {
        top: 90,
        right: 60,
        bottom: 60,
        left: windowWidth < 785 ? 40 : 280,
      },
      maxZoom: MAX_ACTIVITY_ZOOM,
    });

    if (!camera) {
      return;
    }

    map.easeTo({
      center: camera.center,
      zoom: Math.max(camera.zoom || DEFAULT_MAP_ZOOM, MIN_ACTIVITY_ZOOM),
      bearing: 0,
      pitch: 0,
      duration: 1200,
    });
  }, [routeFeatureCollection, isMapLoaded, windowWidth]);

  if (state.loading && access_token) {
    return (
      <div className={LoadingWheel.screen}>
        <div className={LoadingWheel.panel}>
          <div className={LoadingWheel.indicator} aria-hidden="true">
            <div className={LoadingWheel.loading}></div>
          </div>
          <h1 className={LoadingWheel.title}>Building your heatmap</h1>
          <p className={LoadingWheel.message}>
            Plotting{' '}
            <span className={LoadingWheel.count}>
              {state.activityLoadingState || 0}
            </span>{' '}
            activities onto the map.
          </p>
          <div className={LoadingWheel.dots} aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
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

          <MapWrapper>
            {windowWidth < 785 && (
              <MobileFilterPanel>
                <ActivityDropDown
                  className="mobile-map-filter"
                  props={state.nodes}
                  setFilterBySportType={setFilteredSportType}
                />
                <MobileSearchInput
                  type="text"
                  value={searchTxt}
                  placeholder="Search by activity name..."
                  aria-label="Search by activity name"
                  onChange={(e) => setSearchTxt(e.target.value)}
                />
              </MobileFilterPanel>
            )}

            {!mapboxAccessToken && (
              <MapNotice>
                Missing Mapbox token. Set REACT_APP_MAPBOX_KEY to render the map.
              </MapNotice>
            )}

            {isOffline && (
              <MapNotice>Are you offline? Check network connection. </MapNotice>
            )}

            {mapboxAccessToken && (
              <MapStyleToggle aria-label="Map style">
                <MapStyleButton
                  type="button"
                  $active={mapStyle === 'street'}
                  onClick={() => setMapStyle('street')}
                >
                  Street
                </MapStyleButton>
                <MapStyleButton
                  type="button"
                  $active={mapStyle === 'satellite'}
                  onClick={() => setMapStyle('satellite')}
                >
                  Satellite
                </MapStyleButton>
              </MapStyleToggle>
            )}
            <MapCanvas ref={mapContainer} />
          </MapWrapper>
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

const MapWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 620px;
  background: #071018;
`;

const MapCanvas = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;

const MobileFilterPanel = styled.div`
  display: none;

  @media screen and (max-width: 785px) {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 3;
    display: grid;
    grid-template-columns: minmax(110px, 0.85fr) minmax(0, 1.15fr);
    gap: 0.55rem;
    width: min(100% - 5.5rem, 520px);
    padding: 0.55rem;
    box-sizing: border-box;
    background:
      linear-gradient(135deg, rgba(252, 82, 0, 0.94), rgba(31, 41, 55, 0.9)),
      repeating-linear-gradient(
        135deg,
        transparent 0,
        transparent 8px,
        rgba(0, 0, 0, 0.18) 8px,
        rgba(0, 0, 0, 0.18) 10px
      );
    background-blend-mode: normal, multiply;
    border: 1px solid rgba(255, 255, 255, 0.32);
    border-radius: 8px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.36);
    backdrop-filter: blur(14px);
  }

  @media screen and (max-width: 520px) {
    top: 4.15rem;
    left: 0.65rem;
    right: 0.65rem;
    grid-template-columns: 1fr;
    width: auto;
  }

  .mobile-map-filter {
    width: 100%;
    min-width: 0;
    height: 2.65rem;
    margin: 0;
    padding: 0 2rem 0 0.75rem;
    box-sizing: border-box;
    color: #111827;
    background-color: #fffaf6;
    border: 1px solid rgba(17, 24, 39, 0.35);
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 700;
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .mobile-map-filter:focus {
    border-color: #111827;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.72),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }
`;

const MobileSearchInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 2.65rem;
  padding: 0 0.85rem;
  box-sizing: border-box;
  color: #111827;
  background: #fffaf6;
  border: 1px solid rgba(17, 24, 39, 0.35);
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 650;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);

  &::placeholder {
    color: #6b7280;
    font-weight: 600;
  }

  &:focus {
    border-color: #111827;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.72),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }
`;

const MapNotice = styled.div`
  position: absolute;
  top: 6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  max-width: calc(100% - 2rem);
  padding: 0.85rem 1rem;
  color: white;
  background: rgba(17, 24, 39, 0.92);
  border: 1px solid rgba(252, 82, 0, 0.45);
  border-radius: 8px;
  font-size: 0.95rem;
  text-align: center;
`;

const MapStyleToggle = styled.div`
  position: absolute;
  top: 1rem;
  right: 4.75rem;
  z-index: 2;
  display: flex;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.24);

  @media screen and (max-width: 785px) {
    top: 1rem;
    right: 4rem;
  }

  @media screen and (max-width: 420px) {
    top: 4.25rem;
    right: 0.75rem;
  }
`;

const MapStyleButton = styled.button`
  min-width: 78px;
  min-height: 36px;
  padding: 0 0.8rem;
  color: ${(props) => (props.$active ? '#111827' : '#ffffff')};
  background: ${(props) => (props.$active ? '#ffffff' : 'transparent')};
  border: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.25);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;

  &:last-child {
    border-right: 0;
  }

  &:hover {
    background: ${(props) => (props.$active ? '#ffffff' : 'rgba(255, 255, 255, 0.18)')};
  }
`;

const SideNavigation = styled.div`
  height: 100%;
  margin-top: -2.5rem;
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

  @media screen and (max-width: 750px) {
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
