import React, { createRef, useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import styled from 'styled-components';
import {
  getSufferScore,
  getMilesToKms,
  getMetresToFeet,
  formattedDate,
} from '../utils/conversion';

import 'mapbox-gl/dist/mapbox-gl.css';
import Map, {
  NavigationControl,
  Popup,
  FullscreenControl,
  GeolocateControl,
  Source,
  Layer,
} from 'react-map-gl';
import {
  getUserActivityLaps,
  getCommentsByActivityId,
  getDetailedAthleteData,
  getKudoersByActivityId,
} from '../utils/functions';
import polyline from '@mapbox/polyline';
export default function Activity() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const { from } = location.state;
  const coordinates = from?.map.summary_polyline;
  const activity_line = polyline.decode(coordinates);
  let acitivyt_toGEOJSON = polyline.toGeoJSON(coordinates);
  const [kudosoers, setKudosoers] = React.useState([]);
  const [comments, setComments] = React.useState([]);
  const [laps, setLaps] = React.useState([]);
  const [detailedActivity, setDetailedActivity] = React.useState([]);

  const accessToken = localStorage.getItem('access_token');
  const token = JSON.parse(accessToken);
  const TOKEN =
    'pk.eyJ1IjoiZGptZjIwMTUiLCJhIjoiY2p1YjE2emV2MDgwazQ0cGlwZm91OXdmNSJ9.jTBvVcPyilJhSuAPsX_rmw';

  const map = useRef();
  useEffect(() => {
    async function fetchData() {
      await getUserActivityLaps(from.id, token).then((response) => {
        setLaps(response.data);
      });
      await getKudoersByActivityId(from.id, token).then((response) => {
        setKudosoers(response.data);
      });
      await getCommentsByActivityId(from.id, token).then((response) => {
        setComments(response.data);
      });
      await getDetailedAthleteData(from.id, token).then((response) => {
        console.log(response.data);
        setDetailedActivity(response.data);
      });
    }
    fetchData();
  }, [from.id, token]);

  const toggleVisibility = () => {
    if (window.pageYOffset > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };
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

  useEffect(() => {
    if (map.current) {
      const item = [activity_line[1][0], activity_line[1][1]]; // replace with your desired coordinates
      map.current.flyTo({
        center: [item[1], item[0]],
        zoom: 15,
        speed: 0.65,
        curve: 1.5,
        pitch: 40,
        bearing: 0,
        easeTo(t) {
          return t;
        },
        essential: true,
      });
    }
  }, [map, activity_line]);

  // map activity coordinates to GeoJSON from [0][1] to [1][0]
  const mapCoordinates = acitivyt_toGEOJSON?.coordinates.map((item) => {
    return item.map((coords) => {
      return coords;
    });
  });
  const data = {
    type: 'Feature',
    properties: { name: 'activity' },
    geometry: {
      type: 'LineString',
      coordinates: mapCoordinates,
    },
  };
  // animate a white dash along the path of the route to show the route
  // console.log({ detailedActivity });
  return (
    <>
      {/* <ScrollToTop /> */}
      {isVisible && (
        <div onClick={scrollToTop}>
          <ScrollToTop alt="Go to top"></ScrollToTop>
        </div>
      )}

      <div>
        <SideNavigation>
          <CardHeaders>
            <LinkText>
              <Link style={{ color: 'white' }} to="/splits" state={{ from: from }}>
                View Splits
              </Link>
            </LinkText>
            <LinkText>
              <Link style={{ color: 'white' }} to="/activities">
                Go Back
              </Link>
            </LinkText>
            <h3>{from.name}</h3>
            <div>
              {from.suffer_score && getSufferScore('suffer score' + from.suffer_score)}
            </div>
            <h3>{`Average Heart Rate: ${from.average_heartrate}`}</h3>
            <h3>Kudos: {from.kudos_count} </h3>
            {kudosoers.length > 0 && (
              <div>
                <Text>
                  {kudosoers.map((kudoer, index) => {
                    return <span key={index}>{kudoer.firstname + ', '}</span>;
                  })}
                </Text>
                <h4>Comments: {from.comment_count}</h4>
                <Text>
                  {comments.length > 0 && (
                    <div>
                      {comments.map((comment, index) => {
                        return (
                          <>
                            <span key={index}>
                              {comment.athlete.firstname + ' '}{' '}
                              {comment.athlete.lastname + ' '}{' '}
                            </span>
                            <p>
                              <i> {comment.text}</i>
                            </p>
                          </>
                        );
                      })}
                    </div>
                  )}
                </Text>
                <h4>Distance:</h4> <Text>{getMilesToKms(from.distance)}</Text>
                <h4>Total Elevation: </h4>
                <Text>{getMetresToFeet(from.total_elevation_gain)}</Text>
                <Text>{detailedActivity?.description}</Text>
              </div>
            )}
            {detailedActivity && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                style={{ margin: '10px 0px' }}
                src={detailedActivity?.photos?.primary?.urls['100']}
              />
            )}
            <CardHeaders>Achievements: {detailedActivity.achievement_count}</CardHeaders>
            <CardHeaders>PR's: {detailedActivity.pr_count}</CardHeaders>
          </CardHeaders>
        </SideNavigation>
        <div
          style={{
            // position: 'relative',
            width: '99vw',
            height: '100vh',
            border: '1px solid black',
          }}
        >
          <Map
            ref={map}
            initialViewState={{
              latitude: mapCoordinates[0][1],
              longitude: mapCoordinates[0][0],
              zoom: 1,
              bearing: 0,
              pitch: 10,
              maxPitch: 60,
            }}
            terrain={{ source: 'mapbox-dem', exaggeration: 3.5 }}
            mapboxAccessToken={TOKEN}
            maxPitch={50}
            mapStyle="mapbox://styles/mapbox/outdoors-v12"
          >
            <NavigationControl visualizePitch={true} showCompass={true} />
            <GeolocateControl />
            <FullscreenControl />

            <Popup
              style={{ color: 'black', width: '140px' }}
              longitude={mapCoordinates[0][0]}
              latitude={mapCoordinates[0][1]}
            >
              {from.name} <img src={detailedActivity?.photos?.primary?.urls['100']} />
            </Popup>

            <Source id="my-data" type="geojson" data={data}>
              <Layer
                id="line-layer"
                type="line"
                source="my-data"
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                  'line-round-limit': 2,
                }}
                paint={{
                  'line-color': 'red',
                  'line-width': 3,
                  'line-blur-transition': { duration: 2000 },
                }}
              />
            </Source>
          </Map>
        </div>
      </div>
    </>
  );
}

const CardHeaders = styled.div`
  position: relative;
  text-align: left;
  margin-top: 0.5rem;
  margin: 5px 5px;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  font-size: 1rem;
`;

const Text = styled.div`
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  font-size: 0.9rem;
  margin: 5px 10px;
  text-align: left;
`;
const LinkText = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  font-size: 1rem;
  margin: 10px;
  font: bold;
  position: relative;
  display: inline;
  text-align: left;
  color: white;
`;

const ActivityCard = styled.h3`
  position: relative;
  text-align: center;
  margin: 2px 3px 2px 3px;
  background-color: ${(props) => props.theme.colour.ghostwhite};
  background: ${(props) =>
    props.score >= 150
      ? props.theme.colour.red
      : props.score > 50 && props.score < 150
      ? props.theme.colour.green
      : props.theme.colour.transparent};
`;

const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  display: flex;
  z-index: 1000;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  margin: 80px 0px 200px 90vw;
`;
const SideNavigation = styled.div`
  height: 100%;
  width: 250px;
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
  opacity: 0.9;

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
`;
