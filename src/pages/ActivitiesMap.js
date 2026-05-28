import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { FiBox, FiLayers } from 'react-icons/fi';
import { getAthleteActivities } from '../utils/functions';
import { fetchTokenInfo } from '../utils/athleteActivitiesFunctions';
import ActivityDropDown from '../components/ActivityDropDown';
import addActivitiesLayers from '../components/MapActivityLayers';
import Login from '../components/Login';
import styled from 'styled-components';
import { removeDataAfterDuration } from '../utils/helpers';
import { useGetWindowWidth, useScroll } from '../utils/hooks';
import LoadingWheel from '../styles/Loading.module.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  EMPTY_FEATURE_COLLECTION,
  MAP_STYLES,
  MAX_ACTIVITY_ZOOM,
  MAX_SIDEBAR_RESULTS,
  MIN_ACTIVITY_ZOOM,
  createActivityPopupContent,
  filterMapActivities,
  getBoundsForCoordinates,
  getCameraFitKey,
  getDataPolylines,
  getMapViewCamera,
  getRouteCoordinates,
  getRouteFeatureCollection,
} from '../utils/activityMap';

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
  const [isOffline, setIsOffline] = useState(false);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const routeFeatureCollectionRef = useRef(EMPTY_FEATURE_COLLECTION);
  const currentMapStyleRef = useRef('street');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState('street');
  const [isMapStyleOpen, setIsMapStyleOpen] = useState(false);
  const [isThreeDimensional, setIsThreeDimensional] = useState(false);
  const lastCameraFitKeyRef = useRef(null);
  const isThreeDimensionalRef = useRef(false);
  const deferredSearchTxt = useDeferredValue(searchTxt);
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

  const filteredName = useMemo(() => {
    return filterMapActivities(state.nodes, deferredSearchTxt, filteredSportType);
  }, [deferredSearchTxt, filteredSportType, state.nodes]);

  const sidebarActivities = useMemo(
    () => filteredName.slice(0, MAX_SIDEBAR_RESULTS),
    [filteredName],
  );

  const routeFeatureCollection = useMemo(() => {
    return getRouteFeatureCollection(filteredName);
  }, [filteredName]);

  useEffect(() => {
    routeFeatureCollectionRef.current = routeFeatureCollection;
  }, [routeFeatureCollection]);

  useEffect(() => {
    isThreeDimensionalRef.current = isThreeDimensional;
  }, [isThreeDimensional]);

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

        popupRef.current
          .setLngLat(coordinates)
          .setDOMContent(createActivityPopupContent(feature.properties))
          .addTo(map);
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

    map.easeTo({
      ...getMapViewCamera(isThreeDimensional),
      duration: 650,
    });
  }, [isMapLoaded, isThreeDimensional]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) {
      return;
    }

    const source = map.getSource('activities');
    if (source) {
      source.setData(routeFeatureCollection);
    }

    const cameraFitKey = getCameraFitKey({
      filteredSportType,
      activityCount: state.nodes.length,
      isMobile: windowWidth < 785,
    });

    if (lastCameraFitKeyRef.current === cameraFitKey) {
      return;
    }

    lastCameraFitKeyRef.current = cameraFitKey;

    const coordinates = getRouteCoordinates(routeFeatureCollection);

    if (coordinates.length === 0) {
      return;
    }

    const bounds = getBoundsForCoordinates(coordinates);
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
  }, [
    filteredSportType,
    routeFeatureCollection,
    isMapLoaded,
    state.nodes.length,
    windowWidth,
  ]);

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
        aria-pressed={mapStyle === 'street'}
        onClick={() => setMapStyle('street')}
      >
        Street
      </MapStyleButton>
      <MapStyleButton
        type="button"
        $active={mapStyle === 'satellite'}
        aria-pressed={mapStyle === 'satellite'}
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
          <SideNavigation aria-labelledby="heatmap-sidebar-title">
            <SidebarHeader>
              <SidebarTitle id="heatmap-sidebar-title">Heatmap Controls</SidebarTitle>
              <SidebarText>Filter and open mapped Strava activities.</SidebarText>
            </SidebarHeader>
            <ActivityDropDown
              className="desktop-map-filter"
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
              aria-label="Search activities by name"
              onChange={(e) => setSearchTxt(e.target.value)}
            />

            <ActivityResults aria-label="Matching activities" aria-live="polite">
              {sidebarActivities &&
                sidebarActivities.map((activity, i) => (
                  <ActivityResultLink
                    href={`https://www.strava.com/activities/${activity.activityId}`}
                    target="_blank"
                    rel="noreferrer"
                    key={i}
                    aria-label={`Open ${activity.activityName} on Strava`}
                  >
                    <ResultDate>{activity.activityDate}</ResultDate>
                    <ResultName>{activity.activityName}</ResultName>
                    <ResultType>{activity.activityType}</ResultType>
                  </ActivityResultLink>
                ))}
              {filteredName.length > MAX_SIDEBAR_RESULTS && (
                <ResultLimitNote>
                  Showing {MAX_SIDEBAR_RESULTS} of {filteredName.length}. Refine the
                  search to narrow results.
                </ResultLimitNote>
              )}
            </ActivityResults>
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
                <MapViewModeButton
                  type="button"
                  aria-label={`Switch to ${isThreeDimensional ? '2D' : '3D'} map view`}
                  $active={isThreeDimensional}
                  onClick={() => setIsThreeDimensional((enabled) => !enabled)}
                >
                  <MapViewModeIcon aria-hidden="true" />
                  <MobileMapStyleButtonLabel>
                    {isThreeDimensional ? '3D' : '2D'}
                  </MobileMapStyleButtonLabel>
                </MapViewModeButton>
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
              <>
                <MapViewModeControl>
                  <MapViewModeButton
                    type="button"
                    aria-label={`Switch to ${isThreeDimensional ? '2D' : '3D'} map view`}
                    $active={isThreeDimensional}
                    onClick={() => setIsThreeDimensional((enabled) => !enabled)}
                  >
                    <MapViewModeIcon aria-hidden="true" />
                    <MobileMapStyleButtonLabel>
                      {isThreeDimensional ? '3D' : '2D'}
                    </MobileMapStyleButtonLabel>
                  </MapViewModeButton>
                </MapViewModeControl>
                <MapStyleToggle aria-label="Map style">{mapStyleButtons}</MapStyleToggle>
              </>
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
  right: 3.75rem;
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

const MapViewModeControl = styled.div`
  position: absolute;
  top: 1rem;
  right: 14rem;
  z-index: 2;

  @media screen and (max-width: 785px) {
    display: none;
  }
`;

const MapStyleButton = styled.button`
  left: 2rem;
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
  margin-left: 2rem;
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

const MapViewModeButton = styled(MobileMapStyleIconButton)`
  min-height: 2.75rem;
  padding: 0 0.72rem;
  background: ${(props) =>
    props.$active ? 'rgba(252, 82, 0, 0.94)' : 'rgba(15, 23, 42, 0.9)'};

  @media screen and (max-width: 420px) {
    width: 2.9rem;
    min-height: 2.9rem;
    padding: 0;
  }
`;

const MapViewModeIcon = styled(FiBox)`
  width: 1.2rem;
  height: 1.2rem;
  flex: 0 0 auto;
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

const SideNavigation = styled.aside`
  height: calc(100vh - 1.5rem);
  width: clamp(250px, 22vw, 320px);
  display: block;
  position: fixed;
  z-index: 3;
  top: 0.75rem;
  left: 0.75rem;
  scroll-behavior: smooth;
  overflow-y: auto;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid rgba(252, 82, 0, 0.46);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96)),
    linear-gradient(135deg, rgba(252, 82, 0, 0.18), rgba(14, 165, 233, 0.12));
  color: white;
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.44);
  backdrop-filter: blur(18px);
  scrollbar-width: thin;
  scrollbar-color: rgba(252, 82, 0, 0.78) rgba(15, 23, 42, 0.7);

  @media screen and (max-width: 785px) {
    display: none;
  }

  .desktop-map-filter {
    width: 100%;
    min-width: 0;
    height: 2.75rem;
    margin: 0 0 0.75rem;
    padding: 0 2rem 0 0.8rem;
    box-sizing: border-box;
    color: #0f172a;
    background-color: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 8px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.92rem;
    font-weight: 800;
    outline: none;
    box-shadow: 0 10px 22px rgba(2, 6, 23, 0.22);
  }

  .desktop-map-filter:focus {
    border-color: #fc5200;
    box-shadow:
      0 0 0 3px rgba(252, 82, 0, 0.24),
      0 10px 22px rgba(2, 6, 23, 0.22);
  }

  .search__input {
    width: 100%;
    min-height: 2.75rem;
    display: block;
    margin: 0 0 0.85rem;
    padding: 0 0.85rem;
    box-sizing: border-box;
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    color: #111827;
    font-size: 0.92rem;
    font-weight: 700;
    outline: none;
    box-shadow: 0 10px 22px rgba(2, 6, 23, 0.22);
  }

  .search__input:focus {
    border-color: #fc5200;
    box-shadow:
      0 0 0 3px rgba(252, 82, 0, 0.24),
      0 10px 22px rgba(2, 6, 23, 0.22);
  }

  .search__input::placeholder {
    color: #64748b;
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
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.62);
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(252, 82, 0, 0.78);
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(252, 82, 0, 0.96);
  }
`;

const SidebarHeader = styled.header`
  margin-bottom: 0.9rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
`;

const SidebarTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.08rem;
  font-weight: 900;
  line-height: 1.2;
`;

const SidebarText = styled.p`
  margin: 0.35rem 0 0;
  color: #cbd5e1;
  font-size: 0.84rem;
  line-height: 1.4;
`;

const ActivityResults = styled.nav`
  display: grid;
  gap: 0.55rem;
`;

const ActivityResultLink = styled.a`
  display: grid;
  gap: 0.16rem;
  padding: 0.72rem 0.78rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.68);
  color: #ffffff;
  text-decoration: none;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(252, 82, 0, 0.18);
    border-color: rgba(252, 82, 0, 0.62);
    outline: none;
    transform: translateX(2px);
  }
`;

const ResultDate = styled.span`
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 800;
`;

const ResultName = styled.span`
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const ResultType = styled.span`
  color: #cbd5e1;
  font-size: 0.74rem;
  font-weight: 700;
`;

const ResultLimitNote = styled.p`
  margin: 0.35rem 0 0;
  padding: 0.65rem 0.72rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
  color: #cbd5e1;
  font-size: 0.78rem;
  line-height: 1.4;
`;
