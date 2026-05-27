import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import styled from 'styled-components';
import { useScroll } from '../utils/hooks';
import MapCoordinatesHelper from '../utils/mapCoordinates';
import { getSufferScore, getMilesToKms, getMetresToFeet } from '../utils/conversion';
import { addActivityMapLayers } from './MapActivityLayers';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  getCommentsByActivityId,
  getDetailedAthleteData,
  getKudoersByActivityId,
} from '../utils/functions';
import polyline from '@mapbox/polyline';

const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
};

const getActivityLineFeature = (summaryPolyline) => {
  if (!summaryPolyline) {
    return null;
  }

  const activityGeoJson = polyline.toGeoJSON(summaryPolyline);
  return MapCoordinatesHelper(activityGeoJson);
};

const getRouteBounds = (coordinates) => {
  if (!coordinates?.length) {
    return null;
  }

  return coordinates.reduce(
    (bounds, coordinate) => bounds.extend(coordinate),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
  );
};

export default function ActivitiesCard() {
  const { isVisible, scrollToTop } = useScroll();
  const [athleteData, setAthleteData] = React.useState([
    {
      kudosoers: [],
      comments: [],
      detailedActivity: [],
    },
  ]);
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [detailError, setDetailError] = React.useState(null);
  const [mapStyle, setMapStyle] = useState('street');

  const location = useLocation();
  const from = location.state?.from;
  const coordinates = from?.map?.summary_polyline;
  const accessToken = localStorage.getItem('access_token');
  const token = JSON.parse(accessToken);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const currentMapStyleRef = useRef('street');
  const data = useMemo(() => getActivityLineFeature(coordinates), [coordinates]);
  const routeCoordinates = useMemo(() => data?.geometry?.coordinates || [], [data]);

  const routeCenter = useMemo(() => {
    return data ? turf.center(data).geometry.coordinates : [-3.21698, 55.89107];
  }, [data]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [from?.id]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!from?.id || !token || !isOnline) {
        return;
      }

      try {
        const [kudoersResponse, commentsResponse, detailedActivityResponse] =
          await Promise.all([
            getKudoersByActivityId(from.id, token),
            getCommentsByActivityId(from.id, token),
            getDetailedAthleteData(from.id, token),
          ]);

        setAthleteData((prevState) => ({
          ...prevState,
          kudosoers: kudoersResponse.data,
          comments: commentsResponse.data,
          detailedActivity: detailedActivityResponse.data,
        }));
      } catch (error) {
        console.error(error.message);
        setDetailError(
          'Activity details could not be loaded. Check your internet connection and try again.',
        );
      }
    }
    fetchData();
  }, [from?.id, isOnline, token]);

  useEffect(() => {
    if (!data || !mapContainer.current || !isOnline) {
      return;
    }

    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY;
    const map = new mapboxgl.Map({
      style: MAP_STYLES.street,
      antialias: true,
      center: routeCenter,
      zoom: 12,
      pitch: 55,
      bearing: 0,
      interactive: true,
      hash: false,
      container: mapContainer.current,
    });

    mapRef.current = map;

    map.on('style.load', () => {
      addActivityMapLayers(map, data);
    });

    map.on('load', () => {
      map.addControl(new mapboxgl.NavigationControl());
      map.addControl(new mapboxgl.FullscreenControl());
      map.addControl(new mapboxgl.ScaleControl());

      const bounds = getRouteBounds(routeCoordinates);

      if (bounds) {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 280, right: 60 },
          duration: 2000,
          pitch: 55,
          maxZoom: 15,
        });
      }
    });
    return () => {
      map.remove();
      mapRef.current = null;
      currentMapStyleRef.current = 'street';
    };
  }, [data, from?.end_latlng, isOnline, routeCenter, routeCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !MAP_STYLES[mapStyle]) {
      return;
    }

    if (currentMapStyleRef.current === mapStyle) {
      return;
    }

    currentMapStyleRef.current = mapStyle;
    map.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  if (!from) {
    return (
      <UnavailablePage>
        <UnavailablePanel>
          <UnavailableTitle>Activity unavailable</UnavailableTitle>
          <UnavailableText>
            This activity page needs activity data from the dashboard. Go back to the
            activities page and select an activity again.
          </UnavailableText>
          <Link style={{ color: '#fc5200' }} to="/">
            Go Back
          </Link>
        </UnavailablePanel>
      </UnavailablePage>
    );
  }

  if (!isOnline) {
    return (
      <UnavailablePage>
        <UnavailablePanel>
          <UnavailableTitle>Internet connection required</UnavailableTitle>
          <UnavailableText>
            {from.name} cannot be opened while offline because the activity map, comments
            and detailed Strava data require a network connection.
          </UnavailableText>
          <Link style={{ color: '#fc5200' }} to="/">
            Go Back
          </Link>
        </UnavailablePanel>
      </UnavailablePage>
    );
  }

  const primaryPhotoUrl = athleteData?.detailedActivity?.photos?.primary?.urls?.['100'];

  return (
    <>
      {isVisible && <ScrollToTop alt="Go to top" onClick={scrollToTop} />}
      <div style={{ backgroundColor: 'black' }}>
        <SideNavigation>
          <CardHeaders>
            <ActivitySummaryHeader>
              <ActivityTitle>{from?.name}</ActivityTitle>
              {from?.average_heartrate && (
                <ActivityCard props={from?.average_heartrate}>
                  {getSufferScore(from?.average_heartrate)}
                </ActivityCard>
              )}
            </ActivitySummaryHeader>
            <NavActions>
              <ActionLink to="/splits" state={{ from: from }}>
                View Splits
              </ActionLink>
              <ActionLink to="/">Go Back</ActionLink>
            </NavActions>
            <ActivityStatsGrid>
              <ActivityStat>
                <span>Kudos</span>
                <strong>{from?.kudos_count}</strong>
              </ActivityStat>
              <ActivityStat>
                <span>Comments</span>
                <strong>{from?.comment_count}</strong>
              </ActivityStat>
            </ActivityStatsGrid>
            {detailError && <ErrorText>{detailError}</ErrorText>}
            {athleteData?.kudosoers && (
              <div>
                <Text>
                  {athleteData?.kudosoers.map((kudoer, index) => {
                    return <span key={index}>{kudoer.firstname + ', '}</span>;
                  })}
                </Text>
                <Text>
                  <h4>Comments</h4>
                </Text>
                <Text>
                  {athleteData?.comments && (
                    <div>
                      {athleteData.comments.map((comment, index) => {
                        return (
                          <React.Fragment key={index}>
                            <span>
                              {comment.athlete.firstname + ' '}{' '}
                              {comment.athlete.lastname + ' '}{' '}
                            </span>
                            <p>
                              <i> {comment.text}</i>
                            </p>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </Text>
                <Text>
                  <h4>Distance:</h4> {getMilesToKms(from.distance)}
                </Text>
                <Text>
                  <h4>Total Elevation:</h4> {getMetresToFeet(from.total_elevation_gain)}
                </Text>
                <Text>{athleteData.detailedActivity?.description}</Text>
              </div>
            )}
            {primaryPhotoUrl && <ActivityPhoto alt="" src={primaryPhotoUrl} />}

            <Text>Achievements: {athleteData?.detailedActivity?.achievement_count}</Text>
            <Text>PR's: {athleteData?.detailedActivity?.pr_count}</Text>
          </CardHeaders>
        </SideNavigation>

        <MapShell>
          <MapStyleToggle aria-label="Map style">
            <MapStyleButton
              type="button"
              $active={mapStyle === 'street'}
              onClick={() => setMapStyle('street')}
            >
              Streets
            </MapStyleButton>
            <MapStyleButton
              type="button"
              $active={mapStyle === 'satellite'}
              onClick={() => setMapStyle('satellite')}
            >
              Satellite
            </MapStyleButton>
          </MapStyleToggle>
          <Map id="map" ref={(el) => (mapContainer.current = el)}></Map>
        </MapShell>
      </div>
    </>
  );
}

const CardHeaders = styled.div`
  position: relative;
  color: ${(props) => props.theme.colour.white};
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  font-size: 1rem;

  @media screen and (max-width: 600px) {
    width: 100%;
    gap: 0.7rem;
    font-size: 0.92rem;
  }
`;

const Text = styled.div`
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  font-size: 0.92rem;
  margin: 0;
  text-align: left;
  line-height: 1.45;
  color: #dbeafe;
  overflow-wrap: anywhere;

  h3,
  h4,
  p {
    margin: 0.25rem 0;
  }

  h3,
  h4 {
    color: #ffffff;
    font-size: 0.95rem;
  }

  @media screen and (max-width: 600px) {
    display: block;
    width: 100%;
    margin: 0;
    line-height: 1.35;
  }
`;

const ErrorText = styled(Text)`
  margin: 0.75rem 0;
  color: #fecaca;
`;

const UnavailablePage = styled.div`
  min-height: 100vh;
  background: #071018;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`;

const UnavailablePanel = styled.section`
  width: min(100%, 34rem);
  border: 1px solid rgba(252, 82, 0, 0.45);
  border-radius: 12px;
  background: rgba(31, 41, 55, 0.96);
  padding: 1.25rem;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
`;

const UnavailableTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  color: #ffffff;
`;

const UnavailableText = styled.p`
  margin: 0.65rem 0 1rem;
  color: #cbd5e1;
  line-height: 1.5;
`;

const ActivityCard = styled.h3`
  text-align: center;
  background: ${(props) =>
    props.props >= 150
      ? props.theme.colour.red
      : props.props > 50 && props.props < 150
        ? props.theme.colour.green
        : props.theme.colour.transparent};
  min-width: 4.75rem;
  margin: 0;
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.9rem;
  line-height: 1.2;

  @media screen and (max-width: 600px) {
    min-width: auto;
    padding: 0.4rem 0.65rem;
  }
`;

const MapShell = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
`;

const Map = styled.div`
  position: absolute;
  inset: 0;
  text-align: center;
  background-color: ${(props) => props.theme.colour.ghostwhite};
  justify-content: center;
  margin: 0 auto;
  width: 100%;
  height: 100vh;

  @media screen and (max-width: 750px) {
    width: 100%;
    height: 100vh;
    margin: 0 auto;
  }
`;

const MapStyleToggle = styled.div`
  position: absolute;
  top: 1rem;
  right: 4.25rem;
  z-index: 1020;
  display: flex;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.24);

  @media screen and (max-width: 750px) {
    top: 2.75rem;
    right: 0.75rem;
    max-width: calc(100% - 1.5rem);
  }

  @media screen and (max-width: 350px) {
    left: 0.75rem;
    right: 0.75rem;
  }
`;

const MapStyleButton = styled.button`
  min-width: 86px;
  min-height: 40px;
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

  &:hover,
  &:focus-visible {
    background: ${(props) => (props.$active ? '#ffffff' : 'rgba(255, 255, 255, 0.18)')};
    outline: none;
  }

  @media screen and (max-width: 350px) {
    flex: 1;
    min-width: 0;
  }
`;

const ScrollToTop = styled(ArrowUpCircleFill)`
  width: 3rem;
  height: 3rem;
  color: ${(props) => props.theme.colour.strava};
  display: flex;
  z-index: 1200;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  cursor: pointer;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45));

  @media screen and (max-width: 750px) {
    width: 2.75rem;
    height: 2.75rem;
    right: 1rem;
    bottom: 12.75rem;
  }
`;

const SideNavigation = styled.div`
  height: calc(105vh - 4rem);
  width: 280px;
  display: block;
  position: fixed;
  border-right: 1px solid rgba(252, 82, 0, 0.38);
  z-index: 1000;
  top: 4rem;
  left: 0;
  scroll-behavior: smooth;
  padding: 1rem;
  overflow-y: auto;
  box-sizing: border-box;
  background:
    linear-gradient(180deg, rgba(29, 41, 57, 0.98), rgba(7, 16, 24, 0.98)), #071018;
  color: white;
  box-shadow: 12px 0 32px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);

  @media screen and (max-width: 750px) {
    position: relative;
    width: 100%;
    height: auto;
    max-height: min(46vh, 25rem);
    top: 3rem;
    z-index: 2;
    border-right: none;
    border-bottom: 1px solid rgba(252, 82, 0, 0.4);
    overflow-y: auto;
    padding: 0.85rem;
    background:
      linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(7, 16, 24, 0.98)), #071018;
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.38);
  }

  @media screen and (max-width: 350px) {
    max-height: min(52vh, 27rem);
    padding: 0.85rem 0.7rem;
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
`;

const ActivitySummaryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;

  @media screen and (max-width: 600px) {
    align-items: center;
  }
`;

const ActivityTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 1.05rem;
  line-height: 1.25;
  text-align: left;
  overflow-wrap: anywhere;

  @media screen and (max-width: 600px) {
    font-size: 1rem;
  }
`;

const NavActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(252, 82, 0, 0.48);
  border-radius: 8px;
  background: rgba(252, 82, 0, 0.16);
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(252, 82, 0, 0.28);
    border-color: rgba(252, 82, 0, 0.86);
    outline: none;
    transform: translateY(-1px);
  }
`;

const ActivityStatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
`;

const ActivityStat = styled.div`
  min-width: 0;
  padding: 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  text-align: left;

  span {
    display: block;
    color: #9ca3af;
    font-size: 0.74rem;
    letter-spacing: 0;
  }

  strong {
    display: block;
    margin-top: 0.15rem;
    color: #ffffff;
    font-size: 1.25rem;
    line-height: 1;
  }
`;

const ActivityPhoto = styled.img`
  display: block;
  width: min(100%, 190px);
  height: auto;
  margin: 0.75rem auto;
  border-radius: 8px;
  object-fit: cover;

  @media screen and (max-width: 750px) {
    width: min(100%, 260px);
    max-height: 34vh;
  }
`;
