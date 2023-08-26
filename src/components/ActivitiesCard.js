import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import styled from 'styled-components';
import { useScroll } from '../utils/hooks';
import MapCoordinatesHelper from '../utils/mapCoordinates';
import { getSufferScore, getMilesToKms, getMetresToFeet } from '../utils/conversion';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  getCommentsByActivityId,
  getDetailedAthleteData,
  getKudoersByActivityId,
} from '../utils/functions';
import polyline from '@mapbox/polyline';

export default function ActivitiesCard() {
  const [selectedLayer, setSelectedLayer] = useState(
    'mapbox://styles/mapbox/satellite-v9'
  );
  const { isVisible, scrollToTop } = useScroll();
  const [athleteData, setAthleteData] = React.useState([
    {
      kudosoers: [],
      comments: [],
      detailedActivity: [],
    },
  ]);

  const location = useLocation();
  const { from } = location.state;
  const coordinates = from?.map.summary_polyline;
  let activity_toGEOJSON = polyline.toGeoJSON(coordinates);
  const accessToken = localStorage.getItem('access_token');
  const token = JSON.parse(accessToken);
  const mapContainer = useRef(null);
  const data = MapCoordinatesHelper(activity_toGEOJSON);
  turf.center(data);

  const endLocation = {
    center: [from?.end_latlng[1], from?.end_latlng[0]],
    bearing: 0,
    pitch: 0,
  };

  useEffect(() => {
    async function fetchData() {
      await getKudoersByActivityId(from.id, token).then((response) => {
        setAthleteData((prevState) => ({ ...prevState, kudosoers: response.data }));
      });
      await getCommentsByActivityId(from.id, token).then((response) => {
        setAthleteData((prevState) => ({ ...prevState, comments: response.data }));
      });
      await getDetailedAthleteData(from.id, token).then((response) => {
        console.log(response.data);
        setAthleteData((prevState) => ({
          ...prevState,
          detailedActivity: response.data,
        }));
      });
    }
    fetchData();
  }, [from.id, token]);

  const layers = [
    {
      name: 'Satellite',
      style: 'mapbox://styles/mapbox/satellite-v9',
    },
    { name: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v11' },
  ];

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY;
    const map = new mapboxgl.Map({
      projection: 'globe',
      style: selectedLayer,
      antialias: true, // create the gl context with MSAA antialiasing, so custom layers are antialiased
      ...endLocation,
      zoom: 1.5,
      pitch: 55,
      bearing: 60,
      interactive: true,
      hash: false,
      container: mapContainer.current,
    });

    map.on('load', () => {
      map.addSource('linepath', {
        type: 'geojson',
        lineMetrics: true,
        data: data,
      });

      map.setFog({
        'horizon-blend': 0.1, // Exaggerate atmosphere (default is .1)
        'space-color': 'rgb(10, 10, 10)', // Black space
        'star-intensity': 1,
      });
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        source: 'composite',
      });
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: 2,
      });
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 10,
        },
      });
      map.addLayer({
        id: 'track',
        type: 'fill-extrusion',
        source: 'linepath',
        paint: {
          'fill-extrusion-color': '#ff0000',
          'fill-extrusion-height': ['get', 'elevation'],
          'fill-extrusion-base': 4,
          'fill-extrusion-opacity': 0.9,
        },
      });
      map.addControl(new mapboxgl.NavigationControl());
      map.addControl(new mapboxgl.FullscreenControl());
      map.addControl(new mapboxgl.ScaleControl());
      map.addLayer({
        type: 'line',
        source: 'linepath',
        id: 'line-dashed',
        paint: {
          'line-width': 6,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            'yellow',
            0.1,
            'green',
            0.3,
            'yellow',
            0.5,
            'orange',
            0.7,
            'coral',
            1,
            'red',
          ],
        },
      });

      const pinRoute = data.geometry.coordinates;
      // create the marker and popup that will display the elevation queries
      const popup = new mapboxgl.Popup({ closeButton: false });
      new mapboxgl.Marker({
        color: 'red',
        scale: 0.8,
        draggable: false,
        pitchAlignment: 'auto',
        rotationAlignment: 'auto',
      })
        .setLngLat(pinRoute[0])
        .setPopup(popup)
        .addTo(map)
        .togglePopup();
      map.addSource('trace', { type: 'geojson', data: data });
    });

    function rotateAndFlyTo(endLocation) {
      // Get the map instance
      // Rotate the map 360 degrees in 3 seconds
      var bearing = map.getBearing(); // Get the current bearing
      var start = null;
      function animate(timestamp) {
        if (!start) start = timestamp;
        var progress = timestamp - start;
        map.rotateTo((bearing + (360 * progress) / 2000) % 360, { duration: 0 });

        if (progress < 2000) {
          // Continue rotating
          requestAnimationFrame(animate);
        } else {
          // Stop rotating and fly to the end location
          map.rotateTo(bearing);
          map.easeTo({
            center: data.geometry.coordinates[0],
            // zoom: 10,
            zoom: athleteData.distance > 15000 ? 10 : 13,
            pitch: 65,
            bearing: 200,
            duration: 7000,
          });
        }
      }
      requestAnimationFrame(animate);
    }
    rotateAndFlyTo(endLocation);

    return () => map.remove();
  }, [selectedLayer]);

  return (
    <>
      {isVisible && (
        <div onClick={scrollToTop}>
          <ScrollToTop alt="Go to top"></ScrollToTop>
        </div>
      )}
      <div style={{ backgroundColor: 'black' }}>
        <SideNavigation>
          <CardHeaders>
            <LinkText>
              <Link
                style={{ color: 'white', margin: '10px 12px' }}
                to="/splits"
                state={{ from: from }}
              >
                View Splits
              </Link>
            </LinkText>
            <LinkText>
              <Link style={{ color: 'white' }} to="/">
                Go Back
              </Link>
            </LinkText>
            <h3>{from?.name}</h3>
            <div>
              <ActivityCard props={from?.average_heartrate}>
                {from?.average_heartrate && getSufferScore(from.average_heartrate)}{' '}
              </ActivityCard>
            </div>
            <h3>Kudos: {from?.kudos_count} </h3>
            {athleteData?.kudosoers && (
              <div>
                <Text>
                  {athleteData?.kudosoers.map((kudoer, index) => {
                    return <span key={index}>{kudoer.firstname + ', '}</span>;
                  })}
                </Text>
                <h4>Comments: {from?.comment_count}</h4>
                <Text>
                  {athleteData?.comments && (
                    <div>
                      {athleteData.comments.map((comment, index) => {
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
                <Text>{athleteData.detailedActivity?.description}</Text>
              </div>
            )}
            {athleteData?.detailedActivity && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                style={{ margin: '10px 0px' }}
                src={athleteData?.detailedActivity?.photos?.primary?.urls['100']}
              />
            )}

            <CardHeaders>
              Achievements: {athleteData?.detailedActivity?.achievement_count}
            </CardHeaders>
            <CardHeaders>PR's: {athleteData?.detailedActivity?.pr_count}</CardHeaders>
          </CardHeaders>
        </SideNavigation>

        <RightNavigationBar>
          {' '}
          <CardHeaders>
            {layers.map((layer, index) => {
              return (
                <>
                  <div>
                    <RadioButton
                      type="radio"
                      id={layer.index}
                      name={layer.name}
                      checked={layer.style === selectedLayer}
                      onChange={() => setSelectedLayer(layer.style)}
                    ></RadioButton>
                    <Label htmlFor={layer.name}>{layer.name}</Label>
                  </div>
                </>
              );
            })}
          </CardHeaders>
        </RightNavigationBar>
        <div
          id="map"
          ref={(el) => (mapContainer.current = el)}
          style={{
            width: '75%',
            justifyContent: 'center',
            margin: '0 auto',
            height: '100vh',
            position: 'relative',
          }}
        ></div>
      </div>
    </>
  );
}

const CardHeaders = styled.div`
  position: relative;
  text-align: left;
  margin-top: 0.5rem;
  color: ${(props) => props.theme.colour.white};
  margin: 5px 5px;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  font-size: 1rem;
`;

const Text = styled.div`
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  font-size: 0.9rem;
  margin: 0px 0px;
  text-align: left;
  @media screen and (max-width: 600px) {
    font-size: 0.7rem;
    margin: 3px 8px;
    text-align: left;
  }
`;

const LinkText = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  color: 'white';
  font-size: 1rem;
  color: ${(props) => props.theme.colour.red};
  font: bold;
  position: relative;
  display: inline;
  text-align: left;
  color: white;
  @media screen and (max-width: 600px) {
    font-size: 0.7rem;
    margin: 5px;
    position: relative;
    display: inline;
    text-align: left;
    color: white;
  }
`;

const ActivityCard = styled.h3`
  position: relative;
  text-align: center;
  margin: 2px 3px 2px 3px;
  background-color: ${(props) => props.theme.colour.ghostwhite};
  background: ${(props) =>
    props.props >= 150
      ? props.theme.colour.red
      : props.props > 50 && props.props < 150
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
  color: ${(props) => props.theme.colour.red};
  margin: 60px 0px 200px 85vw;
`;

const RadioButton = styled.input`
  /* position: relative; */
  display: inline;
  margin: 0px 10px 30px 50px;
  padding: 0px 0px 0px 0px;
  width: 1rem;
  height: 1rem;
  z-index: 1000;
  &:checked::before {
    content: '';
    width: 1rem;
    height: 1rem;
    background-color: ${(props) => props.theme.colour.red};
    position: absolute;
    border-radius: 50%;
    border: 1px solid ${(props) => props.theme.colour.red};
  }
  @media screen and (max-width: 1250px) {
    width: 1rem;
    height: 1rem;
    top: 5rem;
    margin: 0px 0px 20px 0px;
    &:checked::before {
      content: '';
      width: 1rem;
      height: 1rem;
      background-color: ${(props) => props.theme.colour.red};
      position: absolute;
      border-radius: 50%;
      border: 1px solid ${(props) => props.theme.colour.red};
    }
  }
  @media screen and (max-width: 600px) {
    padding: 0px 0px 0px 0px;
    width: 0.7rem;
    height: 0.7rem;
    top: 5rem;
    &:checked::before {
      content: '';
      width: 0.7rem;
      height: 0.7rem;
      background-color: ${(props) => props.theme.colour.red};
      position: absolute;
      border-radius: 50%;
      border: 1px solid ${(props) => props.theme.colour.red};
    }
  }
`;

const Label = styled.label`
  display: inline;
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 1rem;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  @media screen and (max-width: 1250px) {
    font-size: 0.8rem;
    margin: 0px 0px 0px 5px; //
    cursor: pointer;
  }
`;
const RightNavigationBar = styled.div`
  height: 100%;
  width: calc(14% - 22px);
  display: block;
  color: 'red';
  text-align: cente;
  justify-content: center;
  font-size: 1rem;
  background-color: #111;
  position: fixed;
  border-left: 3px solid grey;
  z-index: 1000;
  top: calc(11vh - 14px);
  right: 0;
  scroll-behavior: smooth;
  padding-top: 20px;
  margin: 0 auto;
  @media screen and (max-width: 750px) {
    width: 25%;
    position: static;
    display: inline;
    /* padding: 5px; */
    color: white;
    border-right: none;
    border-bottom: 3px solid grey;
    overflow: hidden;
  }
  @media screen and (max-width: 350px) {
    z-index: -1;
    display: none;
    padding-top: 0px;
    color: white;
    border-right: none;
    border-bottom: 3px solid grey;
    overflow: hidden;
  }
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
  color: white;
  @media screen and (max-width: 750px) {
    width: 25%;
    position: static;
    display: inline;
    color: white;
    border-right: none;
    border-bottom: 3px solid grey;
    overflow: hidden;
  }
  @media screen and (max-width: 350px) {
    z-index: -1;
    display: none;
    padding-top: 0px;
    color: white;
    border-right: none;
    border-bottom: 3px solid grey;
    overflow: hidden;
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
