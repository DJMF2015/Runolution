import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
// custom hook for getting the window width
export const useGetWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { windowWidth };
};

export const useScroll = () => {
  const [isVisible, setIsVisible] = useState(false);

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
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return { isVisible, scrollToTop };
};

export const useMapbox = (selectedLayer, endLocation, data, from) => {
  // const { elevation, distance } = setQueryData;
  const [queryData, setQueryData] = useState({
    distance: [],
    elevation: [],
  });
  // console.log('elevation', elevation);
  // const mapContainer = useRef(null);
  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY;
    const map = new mapboxgl.Map({
      projection: 'globe',
      style: selectedLayer,
      antialias: true,
      ...endLocation,
      zoom: from.distance < 10000 ? 13.5 : 11.5,
      pitch: 50,
      bearing: 0,
      interactive: true,
      hash: false,
      container: 'map',
    });

    map.on('load', () => {
      // Map initialization logic
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
          'sky-atmosphere-sun-intensity': 15,
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
      const marker = new mapboxgl.Marker({
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

      const animateMarker = () => {
        // The total animation duration, in milliseconds
        const animationDuration = 12000;
        const path = turf.lineString(pinRoute);
        // Get the total line distance
        const pathDistance = turf.lineDistance(path);
        let start;
        function frame(time) {
          if (!start) start = time;
          const animationPhase = (time - start) / animationDuration;
          if (animationPhase > 1) {
            return;
          }

          // Get the new latitude and longitude by sampling along the path
          const alongPath = turf.along(path, pathDistance * animationPhase).geometry
            .coordinates;
          const lngLat = {
            lng: alongPath[0],
            lat: alongPath[1],
          };
          // get the current distance along the path from the total length of the route
          const currentDistance = pathDistance * animationPhase;
          const distance = currentDistance.toFixed(2);
          // Sample the terrain elevation. We rou nd to an integer value to
          // prevent showing a lot of digits during the animation
          const elevation = Math.floor(
            // Do not use terrain exaggeration to get actual meter values
            map.queryTerrainElevation(lngLat, { exaggerated: false })
          );

          setQueryData({ elevation, distance });

          // Update the popup altitude value and marker location
          popup.setHTML(from.name);
          marker.setLngLat(lngLat);

          // Rotate the camera at a slightly lower speed to give some parallax effect in the background
          const rotation = 150 - animationPhase * pathDistance * 4;
          map.setBearing(rotation % 360);
          window.requestAnimationFrame(frame);
        }
        map.fitBounds([
          // southwestern corner of the bounds
          [data.geometry.coordinates[0][0], data.geometry.coordinates[0][1]],
          // northeastern corner of the bounds
          [data.geometry.coordinates[1][0], data.geometry.coordinates[1][1]],
        ]);
        // //zoom to bounds when animation completes
        map.once('idle', () => {
          map.fitBounds(data.geometry.coordinates, {
            zoom: 14,
            pitch: 65,
            bearing: 200,
            duration: 1000,
            rotate: 200 * (Math.PI / 180), //start rotation of animation
            //end location of animation
            center: pinRoute[pinRoute.length - 1],
          });
        });
        window.requestAnimationFrame(frame);
      };
      animateMarker();
    });
    return () => map.remove();
  }, [selectedLayer, endLocation, data, from, queryData]);
};
