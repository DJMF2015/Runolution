import React, { useState, useEffect, useMemo, useRef } from 'react';
import polyline from '@mapbox/polyline';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { FiLayers } from 'react-icons/fi';
import { getAthleteActivities } from '../utils/functions';
import { fetchTokenInfo } from '../utils/athleteActivitiesFunctions';
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
  const [isMapStyleOpen, setIsMapStyleOpen] = useState(false);
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
        const currentAccessToken = await fetchTokenInfo();
        if (!currentAccessToken) {
          setState((prevState) => ({
            ...prevState,
            loading: false,
          }));
          return;
        }

        const stravaActivityResponse = await fetchStravaActivities(currentAccessToken);
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

    fetchData().catch((error) => {
      console.error(error);
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
    });
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

  const setMapLoading = (loading) => {
    setState((prevState) => ({
      ...prevState,
      loading,
    }));
  };

  const setLoadedActivityCount = (activityLoadingState) => {
    setState((prevState) => ({
      ...prevState,
      activityLoadingState,
    }));
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
        setMapLoading(false);
        break;
      } else {
        const loadedActivityCount = stravaActivityResponse.length;
        setLoadedActivityCount(loadedActivityCount);
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
            <span className={LoadingWheel.count}>{state.activityLoadingState || 0}</span>{' '}
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

  const mapStyleButtons = (
    <>
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
    </>
  );

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
              <MobileMapControls>
                <MobileFilterPanel>
                  <ActivityDropDown
                    className="mobile-map-filter"
                    props={state.nodes}
                    setFilterBySportType={setFilteredSportType}
                  />
                  <MobileSearchInput
                    type="text"
                    value={searchTxt}
                    placeholder="Search activities"
                    aria-label="Search by activity name"
                    onChange={(e) => setSearchTxt(e.target.value)}
                  />
                </MobileFilterPanel>
              </MobileMapControls>
            )}

            {windowWidth < 785 && mapboxAccessToken && (
              <MobileMapStyleControl>
                {isMapStyleOpen && (
                  <MobileMapStylePopup aria-label="Choose map style">
                    <MobileMapStyleButton
                      type="button"
                      $active={mapStyle === 'street'}
                      onClick={() => {
                        setMapStyle('street');
                        setIsMapStyleOpen(false);
                      }}
                    >
                      Streets
                    </MobileMapStyleButton>
                    <MobileMapStyleButton
                      type="button"
                      $active={mapStyle === 'satellite'}
                      onClick={() => {
                        setMapStyle('satellite');
                        setIsMapStyleOpen(false);
                      }}
                    >
                      Satellite
                    </MobileMapStyleButton>
                  </MobileMapStylePopup>
                )}
                <MobileMapStyleIconButton
                  type="button"
                  aria-label="Open map style options"
                  aria-expanded={isMapStyleOpen}
                  onClick={() => setIsMapStyleOpen((isOpen) => !isOpen)}
                >
                  <MobileMapStyleIcon aria-hidden="true" />
                  <MobileMapStyleButtonLabel>
                    {mapStyle === 'satellite' ? 'Satellite' : 'Streets'}
                  </MobileMapStyleButtonLabel>
                </MobileMapStyleIconButton>
              </MobileMapStyleControl>
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
              <MapStyleToggle aria-label="Map style">{mapStyleButtons}</MapStyleToggle>
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

const MobileMapControls = styled.div`
  display: none;

  @media screen and (max-width: 785px) {
    position: absolute;
    top: max(0.7rem, env(safe-area-inset-top));
    left: 0.65rem;
    right: 0.65rem;
    z-index: 4;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 2rem;
    gap: 0.55rem;
    align-items: stretch;
    max-width: 42rem;
    margin: 0 auto;
    padding: 0.45rem;
    box-sizing: border-box;
  }

  @media screen and (max-width: 360px) {
    left: 0.45rem;
    right: 0.45rem;
    grid-template-columns: minmax(0, 1fr) 5.35rem;
    gap: 0.4rem;
    padding: 0.4rem;
  }
`;

const MobileFilterPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(8rem, 0.8fr) minmax(0, 1.2fr);
  gap: 0.45rem;
  min-width: 0;

  .mobile-map-filter {
    width: 100%;
    min-width: 0;
    height: 2.35rem;
    margin: 0;
    padding: 0 1.75rem 0 0.65rem;
    box-sizing: border-box;
    color: #0f172a;
    background-color: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.76);
    border-radius: 6px;
    font-size: 0.84rem;
    font-weight: 700;
    outline: none;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
  }

  .mobile-map-filter:focus {
    border-color: #fc5200;
    box-shadow:
      0 0 0 2px rgba(252, 82, 0, 0.28),
      0 6px 16px rgba(15, 23, 42, 0.2);
  }

  @media screen and (max-width: 520px) {
    grid-template-columns: 1fr;
  }

  @media screen and (max-width: 360px) {
    gap: 0.35rem;

    .mobile-map-filter {
      height: 2.15rem;
      font-size: 0.78rem;
      padding-left: 0.55rem;
    }
  }
`;

const MobileSearchInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 2.35rem;
  padding: 0 0.7rem;
  box-sizing: border-box;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(13, 12, 12, 0.76);
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 700;
  outline: none;
  border-color: rgba(15, 23, 42, 0.2);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);

  &::placeholder {
    color: #6b7280;
    font-weight: 600;
  }

  &:focus {
    border-color: #fc5200;
    box-shadow:
      0 0 0 2px rgba(252, 82, 0, 0.28),
      0 6px 16px rgba(15, 23, 42, 0.2);
  }

  @media screen and (max-width: 380px) {
    display: none;
    height: 2.15rem;
    padding: 0 0.55rem;
    font-size: 0.78rem;
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
    display: none;
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

const MobileMapStyleControl = styled.div`
  display: none;

  @media screen and (max-width: 785px) {
    position: absolute;
    right: 0.75rem;
    bottom: max(0.85rem, env(safe-area-inset-bottom));
    z-index: 4;
    display: grid;
    justify-items: end;
    gap: 0.6rem;
  }
`;

const MobileMapStylePopup = styled.div`
  display: grid;
  gap: 0.45rem;
  width: min(13rem, calc(100vw - 1.5rem));
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(31, 41, 55, 0.92)),
    linear-gradient(135deg, rgba(252, 82, 0, 0.24), rgba(59, 130, 246, 0.16));
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(16px);
`;

const MobileMapStyleIconButton = styled.button`
  display: inline-flex;
  min-width: 0;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.8rem;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
  cursor: pointer;
  backdrop-filter: blur(14px);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(252, 82, 0, 0.92);
    border-color: rgba(255, 255, 255, 0.72);
    outline: none;
    transform: translateY(-1px);
  }

  @media screen and (max-width: 420px) {
    width: 3.1rem;
    min-height: 3.1rem;
    padding: 0;
  }
`;

const MobileMapStyleIcon = styled(FiLayers)`
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
`;

const MobileMapStyleButtonLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1;

  @media screen and (max-width: 420px) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

const MobileMapStyleButton = styled.button`
  min-width: 0;
  min-height: 2.55rem;
  padding: 0 0.9rem;
  color: ${(props) => (props.$active ? '#111827' : '#ffffff')};
  background: ${(props) => (props.$active ? '#ffffff' : 'rgba(255, 255, 255, 0.1)')};
  border: 0;
  border-radius: 6px;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  text-align: left;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  &:hover,
  &:focus-visible {
    background: ${(props) => (props.$active ? '#ffffff' : 'rgba(255, 255, 255, 0.18)')};
    outline: none;
    transform: translateY(-1px);
  }

  @media screen and (max-width: 420px) {
    min-height: 2.45rem;
    font-size: 0.82rem;
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
    border: 3px solid black;
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
