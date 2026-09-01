import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import {
  FiBox,
  FiCamera,
  FiChevronDown,
  FiChevronUp,
  FiLayers,
  FiMenu,
  FiMinus,
  FiPlay,
  FiSliders,
  FiSquare,
  FiPlus,
} from 'react-icons/fi';
import styled from 'styled-components';
import { useScroll } from '../hooks/useScroll';
import {
  getSufferScore,
  getMilesToKms,
  getMetresToFeet,
  formattedDate,
} from '../utils/conversion';
import { addActivityMapLayers } from '../utils/MapActivityLayers';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  getCommentsByActivityId,
  getDetailedAthleteData,
  getKudoersByActivityId,
  getDetailedAthletePhoto,
  getAthleteStreams,
} from '../utils/functions';
import { fetchTokenInfo } from '../utils/helpers';
import { ACTIVITY_DETAIL_MAP_STYLES } from '../utils/mapStyles';
import {
  createActivityDetailMap,
  fitRouteToMap,
  getActivityLineFeature,
  getActivityRouteCenter,
} from '../utils/activityDetailMap';
import {
  formatFlyoverDistance,
  getDroneBaseZoom,
  getFlyoverRouteCoordinates,
  getFlyoverRouteDistanceKm,
  getFlyoverRouteFeatureFromStreams,
  getPreparedFlyoverRouteLine,
  setFlyoverRouteGradient,
} from '../utils/flyOverHelper';
import { useFlyoverAnimation } from '../hooks/useFlyoverAnimation';

const PHOTO_URL_SIZES = ['2048', '1200', '1000', '600', '300', '100'];
const CINEMATIC_FLYOVER_CAMERA_MODE = 'cinematic';
const DRONE_FLYOVER_CAMERA_MODE = 'drone';
const DRONE_CAMERA_PITCH = 68;

const getStreamData = (streams, key) => {
  if (Array.isArray(streams)) {
    return streams.find((stream) => stream?.type === key)?.data || [];
  }

  if (Array.isArray(streams?.[key])) {
    return streams[key];
  }

  return streams?.[key]?.data || streams?.streams?.[key]?.data || [];
};

const getBestPhotoUrl = (photo) => {
  const urls = photo?.urls || photo?.photo?.urls || {};
  const sizedUrl = PHOTO_URL_SIZES.map((size) => urls[size]).find(Boolean);

  return (
    sizedUrl ||
    photo?.url ||
    photo?.src ||
    photo?.source ||
    photo?.photo?.url ||
    photo?.photo?.source ||
    null
  );
};

const getPhotoTimestamp = (photo) => {
  return (
    photo?.taken_at ||
    photo?.captured_at ||
    photo?.created_at ||
    photo?.uploaded_at ||
    photo?.timestamp ||
    photo?.time ||
    null
  );
};

const getTimestampMs = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  const numericTimestamp = Number(timestamp);

  if (Number.isFinite(numericTimestamp)) {
    return numericTimestamp > 1000000000000 ? numericTimestamp : numericTimestamp * 1000;
  }

  const parsedTimestamp = Date.parse(timestamp);

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
};

const getPhotoElapsedSeconds = (photoTimestamp, activityStartTimestamp) => {
  const photoTimestampMs = getTimestampMs(photoTimestamp);
  const activityStartTimestampMs = getTimestampMs(activityStartTimestamp);

  if (!Number.isFinite(photoTimestampMs) || !Number.isFinite(activityStartTimestampMs)) {
    return null;
  }

  return Math.max(0, (photoTimestampMs - activityStartTimestampMs) / 1000);
};

const getPhotoCoordinate = (photo) => {
  const coordinate = photo?.location || photo?.latlng || photo?.coordinate;

  if (!Array.isArray(coordinate) || coordinate.length < 2) {
    return null;
  }

  const [lat, lng] = coordinate.map(Number);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lng, lat];
};

/**
 * Normalizes the photo data into a consistent format, filtering out invalid or incomplete entries, and sorting by timestamp or sequence.
 * @param {Array|Object} photos - The photo data to normalize.
 * @returns {Array} The normalized photo list.
 */
const normalizeActivityPhotos = (photos) => {
  const photoList = Array.isArray(photos)
    ? photos
    : photos?.data ||
      photos?.photos ||
      photos?.items ||
      [photos?.primary].filter(Boolean);

  return photoList
    .map((photo, index) => ({
      coordinate: getPhotoCoordinate(photo),
      id: photo?.id || photo?.unique_id || `${getBestPhotoUrl(photo)}-${index}`,
      sequence: index,
      timestamp: getPhotoTimestamp(photo),
      url: getBestPhotoUrl(photo),
    }))
    .filter((photo) => photo.url)
    .sort((firstPhoto, secondPhoto) => {
      const firstTimestamp = getTimestampMs(firstPhoto.timestamp);
      const secondTimestamp = getTimestampMs(secondPhoto.timestamp);

      if (Number.isFinite(firstTimestamp) && Number.isFinite(secondTimestamp)) {
        return firstTimestamp - secondTimestamp;
      }

      return firstPhoto.sequence - secondPhoto.sequence;
    });
};

const getPhotoRoutePointFromStreams = ({
  photoIndex,
  routeCoordinates,
  streams,
  targetElapsedSeconds,
  totalPhotos,
}) => {
  const latLngStream = getStreamData(streams, 'latlng');
  const distanceStream = getStreamData(streams, 'distance');
  const timeStream = getStreamData(streams, 'time');
  const photoProgress = totalPhotos > 0 ? (photoIndex + 1) / (totalPhotos + 1) : 0;
  const streamLength = Math.min(
    latLngStream.length,
    distanceStream.length || latLngStream.length,
    timeStream.length || latLngStream.length,
  );

  /**
   * Gets the route point at a specific stream index.
   * @param {*} streamIndex
   * @returns {Object|null} The route point with coordinate and distanceKm, or null if invalid.
   */
  const getRoutePointAtStreamIndex = (streamIndex) => {
    const coordinate = latLngStream[streamIndex];
    const distanceMetres = Number(distanceStream[streamIndex]);

    if (Array.isArray(coordinate) && coordinate.length >= 2) {
      return {
        coordinate: [coordinate[1], coordinate[0]],
        distanceKm: Number.isFinite(distanceMetres) ? distanceMetres / 1000 : null,
      };
    }

    return null;
  };

  if (
    streamLength > 1 &&
    Number.isFinite(targetElapsedSeconds) &&
    timeStream.length > 1
  ) {
    const firstTime = Number(timeStream[0]);
    const lastTime = Number(timeStream[streamLength - 1]);
    const clampedTargetTime = Math.min(
      Math.max(targetElapsedSeconds, Number.isFinite(firstTime) ? firstTime : 0),
      Number.isFinite(lastTime) ? lastTime : targetElapsedSeconds,
    );

    if (Number.isFinite(firstTime) && clampedTargetTime <= firstTime) {
      return getRoutePointAtStreamIndex(0);
    }

    for (let index = 1; index < streamLength; index += 1) {
      const previousTime = Number(timeStream[index - 1]);
      const currentTime = Number(timeStream[index]);

      if (
        !Number.isFinite(previousTime) ||
        !Number.isFinite(currentTime) ||
        currentTime < clampedTargetTime
      ) {
        continue;
      }

      const previousCoordinate = latLngStream[index - 1];
      const currentCoordinate = latLngStream[index];
      const previousDistance = Number(distanceStream[index - 1]);
      const currentDistance = Number(distanceStream[index]);
      const ratio =
        currentTime === previousTime
          ? 0
          : (clampedTargetTime - previousTime) / (currentTime - previousTime);

      if (
        !Array.isArray(previousCoordinate) ||
        !Array.isArray(currentCoordinate) ||
        previousCoordinate.length < 2 ||
        currentCoordinate.length < 2
      ) {
        return null;
      }

      return {
        coordinate: [
          previousCoordinate[1] + (currentCoordinate[1] - previousCoordinate[1]) * ratio,
          previousCoordinate[0] + (currentCoordinate[0] - previousCoordinate[0]) * ratio,
        ],
        distanceKm:
          Number.isFinite(previousDistance) && Number.isFinite(currentDistance)
            ? (previousDistance + (currentDistance - previousDistance) * ratio) / 1000
            : null,
      };
    }

    return getRoutePointAtStreamIndex(streamLength - 1);
  }

  if (streamLength > 1 && totalPhotos > 0 && timeStream.length > 1) {
    const firstTime = Number(timeStream[0]);
    const lastTime = Number(timeStream[streamLength - 1]);
    const targetTime =
      Number.isFinite(firstTime) && Number.isFinite(lastTime)
        ? firstTime + (lastTime - firstTime) * photoProgress
        : null;

    if (targetTime !== null) {
      for (let index = 1; index < streamLength; index += 1) {
        const previousTime = Number(timeStream[index - 1]);
        const currentTime = Number(timeStream[index]);

        if (
          !Number.isFinite(previousTime) ||
          !Number.isFinite(currentTime) ||
          currentTime < targetTime
        ) {
          continue;
        }

        const previousCoordinate = latLngStream[index - 1];
        const currentCoordinate = latLngStream[index];
        const previousDistance = Number(distanceStream[index - 1]);
        const currentDistance = Number(distanceStream[index]);
        const ratio =
          currentTime === previousTime
            ? 0
            : (targetTime - previousTime) / (currentTime - previousTime);

        if (
          !Array.isArray(previousCoordinate) ||
          !Array.isArray(currentCoordinate) ||
          previousCoordinate.length < 2 ||
          currentCoordinate.length < 2
        ) {
          return null;
        }

        return {
          coordinate: [
            previousCoordinate[1] +
              (currentCoordinate[1] - previousCoordinate[1]) * ratio,
            previousCoordinate[0] +
              (currentCoordinate[0] - previousCoordinate[0]) * ratio,
          ],
          distanceKm:
            Number.isFinite(previousDistance) && Number.isFinite(currentDistance)
              ? (previousDistance + (currentDistance - previousDistance) * ratio) / 1000
              : null,
        };
      }
    }
  }

  if (streamLength > 1 && totalPhotos > 0) {
    const streamIndex = Math.min(
      streamLength - 1,
      Math.max(0, Math.round(photoProgress * (streamLength - 1))),
    );

    return getRoutePointAtStreamIndex(streamIndex);
  }

  if (routeCoordinates.length > 1 && totalPhotos > 0) {
    const routeIndex = Math.min(
      routeCoordinates.length - 1,
      Math.max(
        0,
        Math.round(
          ((photoIndex + 1) / (totalPhotos + 1)) * (routeCoordinates.length - 1),
        ),
      ),
    );

    return {
      coordinate: routeCoordinates[routeIndex],
      distanceKm: null,
    };
  }

  return null;
};

const getPhotoDistanceOnRoute = (coordinate, routeCoordinates) => {
  if (!coordinate || routeCoordinates.length < 2) {
    return null;
  }

  try {
    const routeLine = turf.lineString(routeCoordinates);
    const snappedPoint = turf.nearestPointOnLine(routeLine, turf.point(coordinate), {
      units: 'kilometers',
    });

    return snappedPoint?.properties?.location ?? null;
  } catch (error) {
    return null;
  }
};

const createActivityPhotoMarkerElement = (photo, onSelectPhoto) => {
  const markerElement = document.createElement('div');
  const button = document.createElement('button');
  const image = document.createElement('img');
  const pointer = document.createElement('span');

  markerElement.className = 'activity-photo-marker';
  markerElement.style.width = 'clamp(32px, 3.4vw, 38px)';
  markerElement.style.padding = '0 0 14px';
  markerElement.style.background = 'transparent';
  markerElement.style.position = 'relative';
  markerElement.style.boxSizing = 'border-box';
  markerElement.style.pointerEvents = 'auto';

  button.type = 'button';
  button.style.display = 'block';
  button.style.width = '100%';
  button.style.padding = '3px';
  button.style.border = '1px solid rgba(255, 255, 255, 0.72)';
  button.style.borderRadius = '8px';
  button.style.background = 'rgba(2, 6, 23, 0.88)';
  button.style.backdropFilter = 'blur(12px)';
  button.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.3)';
  button.style.cursor = 'pointer';
  button.style.overflow = 'hidden';

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onSelectPhoto(photo);
  });

  image.src = photo.url;
  image.alt = '';
  image.loading = 'lazy';
  image.style.display = 'block';
  image.style.width = '100%';
  image.style.height = 'clamp(28px, 6vw, 34px)';
  image.style.objectFit = 'cover';
  image.style.borderRadius = '6px';

  pointer.style.position = 'absolute';
  pointer.style.left = '50%';
  pointer.style.bottom = '0';
  pointer.style.width = '4px';
  pointer.style.height = '15px';
  pointer.style.background =
    'linear-gradient(180deg, rgba(241, 6, 6, 0.92), rgb(225, 36, 29))';
  pointer.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.35)';
  pointer.style.transform = 'translateX(-50%)';
  pointer.style.transformOrigin = 'top';

  button.appendChild(image);
  markerElement.appendChild(button);
  markerElement.appendChild(pointer);

  return markerElement;
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
  const [isThreeDimensional, setIsThreeDimensional] = useState(false);
  const [flyoverCameraMode, setFlyoverCameraMode] = useState(
    CINEMATIC_FLYOVER_CAMERA_MODE,
  );
  const [isDroneSettingsOpen, setIsDroneSettingsOpen] = useState(true);
  const [droneCameraPitch, setDroneCameraPitch] = useState(DRONE_CAMERA_PITCH);
  const [droneCameraZoom, setDroneCameraZoom] = useState(null);
  const [isActivityNavCollapsed, setIsActivityNavCollapsed] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const location = useLocation();
  const from = location.state?.from;
  const coordinates = from?.map?.summary_polyline;
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const photoMarkersRef = useRef([]);
  const currentMapStyleRef = useRef('street');
  const isActivityNavCollapsedRef = useRef(false);
  const data = useMemo(() => getActivityLineFeature(coordinates), [coordinates]);
  const routeCoordinates = useMemo(() => data?.geometry?.coordinates || [], [data]);
  const routeCenter = useMemo(() => {
    return getActivityRouteCenter(data);
  }, [data]);
  const flyoverRouteLine = useMemo(() => {
    return getFlyoverRouteFeatureFromStreams(athleteData?.athleteStreams);
  }, [athleteData?.athleteStreams]);
  const preparedFlyoverRouteLine = useMemo(() => {
    return getPreparedFlyoverRouteLine(flyoverRouteLine);
  }, [flyoverRouteLine]);
  const flyoverRouteCoordinates = useMemo(() => {
    return getFlyoverRouteCoordinates(flyoverRouteLine, routeCoordinates);
  }, [flyoverRouteLine, routeCoordinates]);
  const preparedFlyoverRouteCoordinates = useMemo(() => {
    return getFlyoverRouteCoordinates(preparedFlyoverRouteLine, flyoverRouteCoordinates);
  }, [flyoverRouteCoordinates, preparedFlyoverRouteLine]);
  const droneBaseZoom = useMemo(() => {
    const routeLineForZoom = preparedFlyoverRouteLine || flyoverRouteLine;

    return getDroneBaseZoom({
      routeDistanceKm: getFlyoverRouteDistanceKm(routeLineForZoom),
      streams: routeLineForZoom?.properties?.streams,
      totalElevationGain: from?.total_elevation_gain,
    });
  }, [flyoverRouteLine, from?.total_elevation_gain, preparedFlyoverRouteLine]);
  const effectiveDroneCameraZoom = droneCameraZoom ?? droneBaseZoom;

  const {
    consumeRouteFitSkip,
    decreaseFlyoverSpeed,
    dismissFlyoverSummary,
    flyoverAveragePace,
    flyoverDistanceKm,
    flyoverLiveMetricLabel,
    flyoverLivePace,
    flyoverSpeed,
    flyoverTotalDistance,
    flyoverTotalElevation,
    increaseFlyoverSpeed,
    isFlyoverPlaying,
    isFlyoverSpeedMax,
    isFlyoverSpeedMin,
    showFlyoverSummary,
    startFlyover,
    stopFlyover,
  } = useFlyoverAnimation({
    activity: from,
    currentMapStyleRef,
    data,
    droneCameraPitch,
    droneCameraZoom: effectiveDroneCameraZoom,
    flyoverCameraMode,
    flyoverRouteLine,
    isActivityNavCollapsedRef,
    isThreeDimensional,
    mapRef,
    routeCoordinates,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [from?.id]);

  useEffect(() => {
    setDroneCameraZoom(null);
    setDroneCameraPitch(DRONE_CAMERA_PITCH);
  }, [from?.id]);

  useEffect(() => {
    setDroneCameraZoom((currentZoom) => currentZoom ?? droneBaseZoom);
  }, [droneBaseZoom]);

  useEffect(() => {
    isActivityNavCollapsedRef.current = isActivityNavCollapsed;
  }, [isActivityNavCollapsed]);

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
      if (!from?.id || !isOnline) {
        return;
      }

      try {
        const token = await fetchTokenInfo();

        if (!token) {
          return;
        }

        const [
          kudoersResponse,
          commentsResponse,
          detailedActivityResponse,
          athletePhotosResponse,
          athleteStreamsResponse,
        ] = await Promise.all([
          getKudoersByActivityId(from.id, token),
          getCommentsByActivityId(from.id, token),
          getDetailedAthleteData(from.id, token),
          getDetailedAthletePhoto(from.id, token).catch(() => null),
          getAthleteStreams(from.id, token).catch(() => null),
        ]);

        setAthleteData((prevState) => ({
          ...prevState,
          kudosoers: kudoersResponse.data,
          comments: commentsResponse.data,
          detailedActivity: detailedActivityResponse.data,
          athletePhotos: athletePhotosResponse?.data || [],
          athleteStreams: athleteStreamsResponse?.data || null,
        }));

        if (detailedActivityResponse.data?.id) {
          localStorage.setItem(
            `activity-detail-${detailedActivityResponse.data.id}`,
            JSON.stringify(detailedActivityResponse.data),
          );
        }
      } catch (error) {
        console.error(error.message);
        setDetailError(
          'Activity details could not be loaded. Check your internet connection and try again.',
        );
      }
    }
    fetchData();
  }, [from?.id, isOnline]);

  const activityPhotos = useMemo(() => {
    return normalizeActivityPhotos(athleteData?.athletePhotos);
  }, [athleteData?.athletePhotos]);

  const routePhotoMarkers = useMemo(() => {
    const activityStartTimestamp =
      athleteData?.detailedActivity?.start_date ||
      athleteData?.detailedActivity?.start_date_local ||
      from?.start_date ||
      from?.start_date_local;
    const revealRouteCoordinates =
      preparedFlyoverRouteCoordinates?.length > 1
        ? preparedFlyoverRouteCoordinates
        : flyoverRouteCoordinates || routeCoordinates;

    return activityPhotos
      .map((photo, index) => {
        const routePoint = photo.coordinate
          ? null
          : getPhotoRoutePointFromStreams({
              photoIndex: index,
              routeCoordinates,
              streams: athleteData?.athleteStreams,
              targetElapsedSeconds: getPhotoElapsedSeconds(
                photo.timestamp,
                activityStartTimestamp,
              ),
              totalPhotos: activityPhotos.length,
            });
        const coordinate = photo.coordinate || routePoint?.coordinate;
        const distanceKm =
          getPhotoDistanceOnRoute(coordinate, revealRouteCoordinates) ??
          routePoint?.distanceKm;

        return coordinate
          ? {
              ...photo,
              coordinate,
              distanceKm,
            }
          : null;
      })
      .filter(Boolean);
  }, [
    activityPhotos,
    athleteData?.athleteStreams,
    athleteData?.detailedActivity?.start_date,
    athleteData?.detailedActivity?.start_date_local,
    flyoverRouteCoordinates,
    from?.start_date,
    from?.start_date_local,
    preparedFlyoverRouteCoordinates,
    routeCoordinates,
  ]);

  useEffect(() => {
    if (!data || !mapContainer.current || !isOnline) {
      return;
    }

    const map = createActivityDetailMap({
      accessToken: process.env.REACT_APP_MAPBOX_KEY,
      container: mapContainer?.current,
      center: routeCenter,
      style: ACTIVITY_DETAIL_MAP_STYLES.street,
    });

    mapRef.current = map;

    map.on('style.load', () => {
      addActivityMapLayers(map, data);
      setFlyoverRouteGradient(map);
    });

    map.on('load', () => {
      fitRouteToMap(map, routeCoordinates, false, false, 1800);
    });
    return () => {
      map.remove();
      mapRef.current = null;
      currentMapStyleRef.current = 'street';
      photoMarkersRef.current.forEach((marker) => marker.remove());
      photoMarkersRef.current = [];
    };
  }, [data, from, from?.end_latlng, isOnline, routeCenter, routeCoordinates]);

  useEffect(() => {
    const map = mapRef.current;

    photoMarkersRef.current.forEach((marker) => marker.remove());
    photoMarkersRef.current = [];

    if (!map || !routePhotoMarkers.length) {
      return;
    }

    const visiblePhotos = routePhotoMarkers.filter((photo) => {
      if (!isFlyoverPlaying) {
        return true;
      }

      return (
        Number.isFinite(photo.distanceKm) && photo.distanceKm <= flyoverDistanceKm + 0.015
      );
    });

    const markers = visiblePhotos
      .map((photo) => {
        if (!photo.coordinate) {
          return null;
        }

        return new mapboxgl.Marker({
          anchor: 'bottom',
          element: createActivityPhotoMarkerElement(photo, setSelectedPhoto),
          offset: [0, 0],
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        })
          .setLngLat(photo.coordinate)
          .addTo(map);
      })
      .filter(Boolean);

    photoMarkersRef.current = markers;

    return () => {
      markers.forEach((marker) => marker.remove());
      photoMarkersRef.current = [];
    };
  }, [flyoverDistanceKm, isFlyoverPlaying, routePhotoMarkers]);

  useEffect(() => {
    const map = mapRef?.current;
    if (!map) {
      return;
    }

    if (isFlyoverPlaying) {
      return;
    }

    if (consumeRouteFitSkip()) {
      return;
    }

    fitRouteToMap(
      map,
      routeCoordinates,
      isThreeDimensional,
      isActivityNavCollapsedRef.current,
      900,
    );
  }, [consumeRouteFitSkip, isFlyoverPlaying, isThreeDimensional, routeCoordinates]);

  useEffect(() => {
    const map = mapRef?.current;
    if (!map || !ACTIVITY_DETAIL_MAP_STYLES[mapStyle]) {
      return;
    }

    if (currentMapStyleRef.current === mapStyle) {
      return;
    }

    currentMapStyleRef.current = mapStyle;
    stopFlyover();
    map.setStyle(ACTIVITY_DETAIL_MAP_STYLES[mapStyle]);
  }, [mapStyle, stopFlyover]);

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

  const activityDate =
    athleteData?.detailedActivity?.start_date_local ||
    athleteData?.detailedActivity?.start_date ||
    from?.start_date_local ||
    from?.start_date;
  const activityDateLabel = formattedDate(activityDate) || 'Date unavailable';
  const primaryPhotoUrl =
    activityPhotos[0]?.url ||
    getBestPhotoUrl(athleteData?.detailedActivity?.photos?.primary);
  const isDroneFlyoverCamera = flyoverCameraMode === DRONE_FLYOVER_CAMERA_MODE;
  const nextMapStyle = mapStyle === 'satellite' ? 'street' : 'satellite';

  return (
    <>
      {isVisible && (
        <ScrollToTop
          alt="Go to top"
          $navCollapsed={isActivityNavCollapsed}
          onClick={scrollToTop}
        />
      )}
      {selectedPhoto && (
        <PhotoLightbox
          role="dialog"
          aria-modal="true"
          aria-label="Activity photo"
          onClick={() => setSelectedPhoto(null)}
        >
          <PhotoLightboxPanel onClick={(event) => event.stopPropagation()}>
            <PhotoLightboxCloseButton
              type="button"
              aria-label="Close activity photo"
              onClick={() => setSelectedPhoto(null)}
            >
              &times;
            </PhotoLightboxCloseButton>
            <PhotoLightboxImage alt="" src={selectedPhoto.url} />
          </PhotoLightboxPanel>
        </PhotoLightbox>
      )}
      <PageShell>
        <SideNavigation
          aria-label="Activity details"
          id="activity-detail-navigation"
          $collapsed={isActivityNavCollapsed}
        >
          <ActivityNavToggle
            type="button"
            aria-controls="activity-detail-navigation"
            aria-expanded={!isActivityNavCollapsed}
            aria-label={
              isActivityNavCollapsed
                ? 'Show activity detail navigation'
                : 'Hide activity detail navigation'
            }
            $collapsed={isActivityNavCollapsed}
            onClick={() => setIsActivityNavCollapsed((isCollapsed) => !isCollapsed)}
          >
            <FiMenu aria-hidden="true" />
          </ActivityNavToggle>
          {!isActivityNavCollapsed && (
            <CardHeaders>
              <ActivitySummaryHeader>
                <ActivityTitle>{from?.name}</ActivityTitle>
                <ActivityDate dateTime={activityDate || undefined}>
                  {activityDateLabel}
                </ActivityDate>
                {from?.average_heartrate && (
                  <ActivityCard props={from?.average_heartrate}>
                    {getSufferScore(from?.average_heartrate)}
                  </ActivityCard>
                )}
              </ActivitySummaryHeader>
              <NavActions>
                <ActionLink
                  to="/splits"
                  state={{ from, detailedActivity: athleteData?.detailedActivity }}
                >
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
                <ActivityStat>
                  <span>Distance</span>
                  <strong>{getMilesToKms(from.distance)}</strong>
                </ActivityStat>
                <ActivityStat>
                  <span>Elevation</span>
                  <strong>{getMetresToFeet(from.total_elevation_gain)}</strong>
                </ActivityStat>
              </ActivityStatsGrid>
              {detailError && <ErrorText>{detailError}</ErrorText>}
              {athleteData?.kudosoers && (
                <ActivityDetails>
                  <Text>
                    <TextLabel>Kudos from</TextLabel>
                    {athleteData?.kudosoers.map((kudoer, index) => {
                      return <span key={index}>{kudoer.firstname + ', '}</span>;
                    })}
                  </Text>
                  <Text>
                    <TextLabel>Comments</TextLabel>
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
                  {athleteData.detailedActivity?.description && (
                    <Text>{athleteData.detailedActivity.description}</Text>
                  )}
                </ActivityDetails>
              )}
              {primaryPhotoUrl && <ActivityPhoto alt="" src={primaryPhotoUrl} />}

              <CompactStats>
                <Text>
                  Achievements: {athleteData?.detailedActivity?.achievement_count}
                </Text>
                <Text>PR's: {athleteData?.detailedActivity?.pr_count}</Text>
              </CompactStats>
            </CardHeaders>
          )}
        </SideNavigation>

        <MapShell>
          <TopFlyoverControlBar>
            <MapViewModeButton
              type="button"
              aria-label={`Switch to ${isThreeDimensional ? '2D' : '3D'} map view`}
              $active={isThreeDimensional}
              onClick={() => setIsThreeDimensional((enabled) => !enabled)}
            >
              <MapViewModeIcon aria-hidden="true" />
              <MapStyleButtonLabel>
                {isThreeDimensional ? '3D' : '2D'}
              </MapStyleButtonLabel>
            </MapViewModeButton>
            <FlyoverControl>
              <FlyoverButton
                type="button"
                aria-label="Play route flyover"
                disabled={isFlyoverPlaying || flyoverRouteCoordinates.length < 2}
                onClick={startFlyover}
              >
                <FiPlay aria-hidden="true" />
                <FlyoverLabel>Play</FlyoverLabel>
              </FlyoverButton>
              <FlyoverButton
                type="button"
                aria-label="Stop route flyover"
                disabled={!isFlyoverPlaying}
                onClick={stopFlyover}
              >
                <FiSquare aria-hidden="true" />
                <FlyoverLabel>Stop</FlyoverLabel>
              </FlyoverButton>
              <FlyoverSpeedGroup aria-label="Flyover speed controls">
                <FlyoverButton
                  type="button"
                  aria-label="Decrease flyover speed"
                  disabled={isFlyoverSpeedMin}
                  onClick={decreaseFlyoverSpeed}
                >
                  <FiMinus aria-hidden="true" />
                </FlyoverButton>
                <FlyoverSpeedValue aria-live="polite">{flyoverSpeed}x</FlyoverSpeedValue>
                <FlyoverButton
                  type="button"
                  aria-label="Increase flyover speed"
                  disabled={isFlyoverSpeedMax}
                  onClick={increaseFlyoverSpeed}
                >
                  <FiPlus aria-hidden="true" />
                </FlyoverButton>
              </FlyoverSpeedGroup>
            </FlyoverControl>
          </TopFlyoverControlBar>
          {isFlyoverPlaying && (
            <FlyoverLiveStats $navCollapsed={isActivityNavCollapsed}>
              <FlyoverLiveStat $featured>
                <span>Distance</span>
                <strong>{formatFlyoverDistance(flyoverDistanceKm)}</strong>
              </FlyoverLiveStat>
              <FlyoverLiveStat>
                <span>{flyoverLiveMetricLabel}</span>
                <strong>{flyoverLivePace}</strong>
              </FlyoverLiveStat>
            </FlyoverLiveStats>
          )}
          {showFlyoverSummary && (
            <FlyoverSummary aria-live="polite">
              <FlyoverSummaryCloseButton
                type="button"
                aria-label="Close flyover summary"
                onClick={dismissFlyoverSummary}
              >
                &times;
              </FlyoverSummaryCloseButton>

              <FlyoverSummaryStat>
                <span>Distance</span>
                <strong>{flyoverTotalDistance}</strong>
              </FlyoverSummaryStat>
              <FlyoverSummaryStat>
                <span>Avg Pace</span>
                <strong>{flyoverAveragePace}</strong>
              </FlyoverSummaryStat>
              <FlyoverSummaryStat>
                <span>Elevation</span>
                <strong>{flyoverTotalElevation}</strong>
              </FlyoverSummaryStat>
            </FlyoverSummary>
          )}
          <MapStyleControl $navCollapsed={isActivityNavCollapsed}>
            <MapStyleIconButton
              type="button"
              aria-label={`Switch to ${
                nextMapStyle === 'satellite' ? 'satellite' : 'outdoors'
              } map`}
              onClick={() => setMapStyle(nextMapStyle)}
            >
              <MapStyleIcon aria-hidden="true" />
              <MapStyleButtonLabel>
                {mapStyle === 'satellite' ? 'satellite' : 'outdoors'}
              </MapStyleButtonLabel>
            </MapStyleIconButton>
            <DroneCameraControl>
              <DroneCameraToggle
                type="button"
                aria-label={
                  isDroneFlyoverCamera
                    ? 'Use standard flyover camera'
                    : 'Use drone flyover camera'
                }
                aria-pressed={isDroneFlyoverCamera}
                $active={isDroneFlyoverCamera}
                onClick={() =>
                  setFlyoverCameraMode((currentMode) => {
                    const nextMode =
                      currentMode === DRONE_FLYOVER_CAMERA_MODE
                        ? CINEMATIC_FLYOVER_CAMERA_MODE
                        : DRONE_FLYOVER_CAMERA_MODE;

                    if (nextMode === DRONE_FLYOVER_CAMERA_MODE) {
                      setIsDroneSettingsOpen(true);
                    }

                    return nextMode;
                  })
                }
              >
                <DroneCameraIcon aria-hidden="true" />
                <MapStyleButtonLabel>
                  {isDroneFlyoverCamera ? 'drone' : 'flyover'}
                </MapStyleButtonLabel>
              </DroneCameraToggle>
              {isDroneFlyoverCamera && (
                <DronePanelToggle
                  type="button"
                  aria-expanded={isDroneSettingsOpen}
                  aria-label={
                    isDroneSettingsOpen
                      ? 'Hide drone camera settings'
                      : 'Show drone camera settings'
                  }
                  onClick={() => setIsDroneSettingsOpen((isOpen) => !isOpen)}
                >
                  <FiSliders aria-hidden="true" />
                  <span>{isDroneSettingsOpen ? 'Hide' : 'Tune'}</span>
                  {isDroneSettingsOpen ? (
                    <FiChevronDown aria-hidden="true" />
                  ) : (
                    <FiChevronUp aria-hidden="true" />
                  )}
                </DronePanelToggle>
              )}
              {isDroneFlyoverCamera && isDroneSettingsOpen && (
                <DroneCameraPanel aria-label="Drone camera settings">
                  <DroneSliderHeader>
                    <FiSliders aria-hidden="true" />
                    <span>Drone view</span>
                  </DroneSliderHeader>
                  <DroneSliderRow>
                    <DroneSliderLabel htmlFor="drone-camera-zoom">
                      Zoom <strong>{effectiveDroneCameraZoom.toFixed(1)}</strong>
                    </DroneSliderLabel>
                    <DroneSliderHint>Closer cockpit view at higher zoom</DroneSliderHint>
                    <DroneRange
                      id="drone-camera-zoom"
                      type="range"
                      min="13"
                      max="17.3"
                      step="0.1"
                      value={effectiveDroneCameraZoom}
                      aria-label="Drone camera zoom"
                      onChange={(event) => setDroneCameraZoom(Number(event.target.value))}
                    />
                  </DroneSliderRow>
                  <DroneSliderRow>
                    <DroneSliderLabel htmlFor="drone-camera-pitch">
                      Pitch <strong>{droneCameraPitch}°</strong>
                    </DroneSliderLabel>
                    <DroneSliderHint>
                      Higher pitch sits closer to the line
                    </DroneSliderHint>
                    <DroneRange
                      id="drone-camera-pitch"
                      type="range"
                      min="45"
                      max="85"
                      step="1"
                      value={droneCameraPitch}
                      aria-label="Drone camera pitch"
                      onChange={(event) =>
                        setDroneCameraPitch(Number(event.target.value))
                      }
                    />
                  </DroneSliderRow>
                </DroneCameraPanel>
              )}
            </DroneCameraControl>
          </MapStyleControl>
          <Map
            id="map"
            ref={(el) => (mapContainer ? (mapContainer.current = el) : null)}
          ></Map>
        </MapShell>
      </PageShell>
    </>
  );
}

const PageShell = styled.div`
  min-height: 100vh;
  background: #020617;
`;

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
    gap: 0.62rem;
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

const TextLabel = styled.span`
  display: block;
  margin-bottom: 0.25rem;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
`;

const ActivityDetails = styled.div`
  display: grid;
  gap: 0.72rem;
  padding-top: 0.25rem;
`;

const CompactStats = styled.div`
  display: grid;
  gap: 0.25rem;
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

  @media screen and (max-width: 800px) {
    width: 100%;
    height: 100vh;
    margin: 0 auto;
  }
`;

const PhotoLightbox = styled.div`
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(14px);
`;

const PhotoLightboxPanel = styled.div`
  position: relative;
  width: min(920px, 94vw);
  max-height: 88vh;
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96)),
    linear-gradient(135deg, rgba(252, 82, 0, 0.18), rgba(14, 165, 233, 0.12));
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.55);
`;

const PhotoLightboxImage = styled.img`
  display: block;
  width: 100%;
  max-height: calc(88vh - 1.1rem);
  border-radius: 10px;
  object-fit: contain;
`;

const PhotoLightboxCloseButton = styled.button`
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 1;
  width: 2.45rem;
  height: 2.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 999px;
  background: rgba(252, 82, 0, 0.96);
  color: #ffffff;
  cursor: pointer;
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.38);

  &:hover,
  &:focus-visible {
    background: rgba(255, 106, 36, 1);
    outline: none;
  }
`;

const MapStyleControl = styled.div`
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 1020;
  display: grid;
  justify-items: end;
  gap: 0.6rem;

  @media screen and (max-width: 1023px) {
    right: 0.75rem;
    bottom: ${(props) =>
      props.$navCollapsed
        ? 'calc(max(0.85rem, env(safe-area-inset-bottom)) + 4rem)'
        : 'calc(max(0.85rem, env(safe-area-inset-bottom)) + min(34vh, 17rem) + 0.75rem)'};
  }

  @media screen and (max-width: 420px) {
    bottom: ${(props) =>
      props.$navCollapsed
        ? 'calc(max(0.75rem, env(safe-area-inset-bottom)) + 4rem)'
        : 'calc(max(0.75rem, env(safe-area-inset-bottom)) + min(30vh, 14.5rem) + 0.65rem)'};
  }
`;

const TopFlyoverControlBar = styled.div`
  position: absolute;
  top: 1rem;
  z-index: 1030;
  right: 5rem;
  display: flex;
  width: max-content;
  align-items: stretch;
  justify-content: flex-end;
  gap: 0.55rem;
  max-width: calc(100vw - 6rem);

  @media screen and (max-width: 800px) {
    right: 4.75rem;
    max-width: calc(100vw - 5.5rem);
  }

  @media screen and (max-width: 640px) {
    left: auto;
    right: 4.75rem;
    max-width: calc(100vw - 5.5rem);
  }

  @media screen and (max-width: 520px) {
    gap: 0.42rem;
  }

  @media screen and (max-width: 420px) {
    left: auto;
    right: 4.5rem;
    gap: 0.35rem;
    max-width: calc(100vw - 5.25rem);
  }

  @media screen and (max-width: 340px) {
    top: 4.5rem;
    right: 0.75rem;
    max-width: calc(100vw - 1.5rem);
  }
`;

const FlyoverControl = styled.div`
  display: inline-flex;
  flex: 0 0 auto;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(14px);

  @media screen and (max-width: 520px) {
    flex: 0 0 auto;
  }

  @media screen and (max-width: 420px) {
    border-radius: 14px;
  }
`;

const FlyoverButton = styled.button`
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.75rem;
  border: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:last-child {
    border-right: 0;
  }

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    background: rgba(252, 82, 0, 0.92);
    outline: none;
  }

  &:disabled {
    color: rgba(255, 255, 255, 0.46);
    cursor: not-allowed;
  }

  svg {
    width: 1rem;
    height: 1rem;
    flex: 0 0 auto;
  }

  @media screen and (max-width: 520px) {
    flex: 0 0 2.75rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0;
  }
`;

const FlyoverSpeedGroup = styled.div`
  display: inline-flex;
  align-items: center;
  border-left: 1px solid rgba(255, 255, 255, 0.18);
`;

const FlyoverSpeedValue = styled.span`
  min-width: 2.25rem;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 900;
  text-align: center;
`;

const FlyoverLabel = styled.span`
  @media screen and (max-width: 520px) {
    position: absolute;
    width: 1em;
    height: 2em;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

const FlyoverLiveStats = styled.div`
  position: absolute;
  left: ${(props) =>
    props.$navCollapsed ? '5.35rem' : 'calc(clamp(280px, 24vw, 340px) + 1.2rem)'};
  bottom: 1rem;
  z-index: 1025;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 0.7rem;
  align-items: center;
  padding: 0.62rem 0.82rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.38);
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.76);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  pointer-events: none;

  @media screen and (max-width: 980px) {
    left: ${(props) => (props.$navCollapsed ? '5.1rem' : 'calc(260px + 1rem)')};
  }

  @media screen and (max-width: 1023px) {
    left: 1rem;
    bottom: ${(props) =>
      props.$navCollapsed
        ? 'calc(max(0.85rem, env(safe-area-inset-bottom)) + 4.35rem)'
        : 'calc(max(0.85rem, env(safe-area-inset-bottom)) + min(34vh, 17rem) + 0.75rem)'};
  }

  @media screen and (max-width: 420px) {
    left: 0.75rem;
    gap: 0.5rem;
    padding: 0.52rem 0.62rem;
    bottom: ${(props) =>
      props.$navCollapsed
        ? 'calc(max(0.75rem, env(safe-area-inset-bottom)) + 4.15rem)'
        : 'calc(max(0.75rem, env(safe-area-inset-bottom)) + min(30vh, 14.5rem) + 0.65rem)'};
  }
`;

const FlyoverLiveStat = styled.div`
  display: grid;
  gap: 0.12rem;
  justify-items: ${(props) => (props.$featured ? 'center' : 'start')};
  text-align: ${(props) => (props.$featured ? 'center' : 'left')};

  span {
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1;
    text-transform: uppercase;
  }

  strong {
    color: #ffffff;
    font-size: ${(props) => (props.$featured ? '36px' : '0.98rem')};
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    text-shadow: ${(props) =>
      props.$featured
        ? `-1px -1px 0 rgba(0, 0, 0, 0.86),
      1px -1px 0 rgba(0, 0, 0, 0.86),
      -1px 1px 0 rgba(0, 0, 0, 0.86),
      1px 1px 0 rgba(0, 0, 0, 0.86),
      0 4px 14px rgba(0, 0, 0, 0.55)`
        : 'inherit'};
    -webkit-text-stroke: ${(props) =>
      props.$featured ? '0.45px rgba(0, 0, 0, 0.88)' : '0'};
  }

  @media screen and (max-width: 800px) {
    strong {
      font-size: ${(props) => (props.$featured ? '27px' : '0.98rem')};
    }
  }

  @media screen and (max-width: 420px) {
    strong {
      font-size: ${(props) => (props.$featured ? '27px' : '0.86rem')};
    }
  }
`;

const FlyoverSummary = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1026;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  width: min(34rem, calc(100vw - 2rem));
  padding: 1.05rem 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.5);
  color: #ffffff;
  text-align: center;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.78);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.36);
  transform: translate(-50%, -50%);
  backdrop-filter: blur(12px);
  pointer-events: auto;

  @media screen and (max-width: 620px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    width: min(18rem, calc(100vw - 1.5rem));
    padding: 0.9rem 1rem;
  }
`;

const FlyoverSummaryStat = styled.div`
  display: grid;
  gap: 0.28rem;

  span {
    color: rgba(255, 255, 255, 0.76);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1;
    text-transform: uppercase;
  }

  strong {
    color: #ffffff;
    font-size: clamp(1.45rem, 3vw, 2.35rem);
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }
`;

const FlyoverSummaryCloseButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 50%;
  background: rgba(252, 82, 0, 0.92);
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.9;
  transition:
    background 160ms ease,
    opacity 160ms ease;
  &:hover,
  &:focus-visible {
    background: rgba(252, 82, 0, 0.96);
    opacity: 1;
    outline: none;
  }
`;

const MapStyleIconButton = styled.button`
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

const MapViewModeButton = styled(MapStyleIconButton)`
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

const MapStyleIcon = styled(FiLayers)`
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
`;

const MapViewModeIcon = styled(FiBox)`
  width: 1.2rem;
  height: 1.2rem;
  flex: 0 0 auto;
`;

const DroneCameraControl = styled.div`
  display: grid;
  justify-items: end;
  gap: 0.5rem;
`;

const DroneCameraToggle = styled(MapStyleIconButton)`
  min-height: 2.75rem;
  padding: 0 0.72rem;
  background: ${(props) =>
    props.$active
      ? 'linear-gradient(135deg, rgba(252, 82, 0, 0.98), rgba(14, 165, 233, 0.92))'
      : 'rgba(15, 23, 42, 0.9)'};

  @media screen and (max-width: 420px) {
    width: 2.9rem;
    min-height: 2.9rem;
    padding: 0;
  }
`;

const DroneCameraIcon = styled(FiCamera)`
  width: 1.18rem;
  height: 1.18rem;
  flex: 0 0 auto;
`;

const DronePanelToggle = styled.button`
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  padding: 0 0.58rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  backdrop-filter: blur(12px);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  svg {
    width: 0.9rem;
    height: 0.9rem;
    flex: 0 0 auto;
  }

  &:hover,
  &:focus-visible {
    background: rgba(252, 82, 0, 0.92);
    border-color: rgba(255, 255, 255, 0.58);
    outline: none;
    transform: translateY(-1px);
  }

  @media screen and (max-width: 420px) {
    min-height: 2.1rem;
    padding: 0 0.48rem;
    font-size: 0.68rem;
  }
`;

const DroneCameraPanel = styled.div`
  width: min(13.75rem, calc(100vw - 1.5rem));
  display: grid;
  gap: 0.62rem;
  padding: 0.68rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 8px;
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.9)),
    linear-gradient(135deg, rgba(252, 82, 0, 0.2), rgba(14, 165, 233, 0.16));
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38);
  color: #ffffff;
  backdrop-filter: blur(16px);

  @media screen and (max-width: 420px) {
    width: min(12.25rem, calc(100vw - 1.25rem));
    padding: 0.58rem;
  }
`;

const DroneSliderHeader = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;

  svg {
    width: 0.95rem;
    height: 0.95rem;
    flex: 0 0 auto;
    color: #38bdf8;
  }
`;

const DroneSliderRow = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const DroneSliderLabel = styled.label`
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;

  strong {
    color: #ffffff;
    font-size: 0.76rem;
    white-space: nowrap;
  }
`;

const DroneSliderHint = styled.span`
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1;
`;

const DroneRange = styled.input`
  width: 100%;
  accent-color: #fc5200;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid rgba(56, 189, 248, 0.9);
    outline-offset: 3px;
  }
`;

const MapStyleButtonLabel = styled.span`
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
  bottom: 5rem;
  cursor: pointer;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45));

  @media screen and (max-width: 1023px) {
    width: 2.75rem;
    height: 2.75rem;
    right: 0.85rem;
    bottom: ${(props) =>
      props.$navCollapsed
        ? 'calc(max(0.85rem, env(safe-area-inset-bottom)) + 8rem)'
        : 'calc(max(0.85rem, env(safe-area-inset-bottom)) + min(34vh, 17rem) + 4.8rem)'};
  }

  @media screen and (max-width: 420px) {
    bottom: ${(props) =>
      props.$navCollapsed
        ? 'calc(max(0.75rem, env(safe-area-inset-bottom)) + 7.8rem)'
        : 'calc(max(0.75rem, env(safe-area-inset-bottom)) + min(30vh, 14.5rem) + 4.55rem)'};
  }
`;

const SideNavigation = styled.aside`
  height: 100dvh;
  width: ${(props) => (props.$collapsed ? '4.35rem' : 'clamp(280px, 24vw, 340px)')};
  display: block;
  position: fixed;
  border-right: 1px solid rgba(252, 82, 0, 0.5);
  z-index: 1000;
  top: 0;
  left: 0;
  scroll-behavior: smooth;
  padding: ${(props) => (props.$collapsed ? '0.62rem' : '1.05rem')};
  overflow-y: ${(props) => (props.$collapsed ? 'hidden' : 'auto')};
  box-sizing: border-box;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98)),
    linear-gradient(135deg, rgba(252, 82, 0, 0.18), rgba(14, 165, 233, 0.12));
  color: white;
  box-shadow: 18px 0 42px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  transition:
    width 160ms ease,
    padding 160ms ease,
    max-height 220ms ease,
    opacity 180ms ease;
  scrollbar-width: thin;
  scrollbar-color: rgba(252, 82, 0, 0.72) rgba(15, 23, 42, 0.72);

  @media screen and (max-width: 980px) {
    width: ${(props) => (props.$collapsed ? '4.15rem' : '260px')};
    padding: ${(props) => (props.$collapsed ? '0.58rem' : '0.9rem')};
  }

  @media screen and (max-width: 1023px) {
    top: auto;
    left: 0.75rem;
    right: 0.75rem;
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    width: auto;
    height: auto;
    max-height: ${(props) => (props.$collapsed ? '3.75rem' : 'min(34vh, 17rem)')};
    z-index: 1005;
    border: 1px solid rgba(252, 82, 0, 0.46);
    border-radius: 14px;
    overflow-y: ${(props) => (props.$collapsed ? 'hidden' : 'auto')};
    padding: ${(props) => (props.$collapsed ? '0.48rem' : '0.82rem')};
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96)),
      linear-gradient(135deg, rgba(252, 82, 0, 0.22), rgba(14, 165, 233, 0.14));
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.48);
  }

  @media screen and (max-width: 420px) {
    left: 0.55rem;
    right: 0.55rem;
    max-height: ${(props) => (props.$collapsed ? '3.55rem' : 'min(30vh, 14.5rem)')};
    padding: ${(props) => (props.$collapsed ? '0.42rem' : '0.72rem')};
    border-radius: 12px;
  }
  /* customise scrollbar for modern browser except firefox*/
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(252, 82, 0, 0.72);
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(252, 82, 0, 0.95);
  }
`;

const ActivityNavToggle = styled.button`
  position: sticky;
  top: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-width: 3rem;
  min-height: 3rem;
  padding: 0 0.75rem;
  margin-bottom: ${(props) => (props.$collapsed ? 0 : '0.85rem')};
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(252, 82, 0, 0.98), rgba(234, 88, 12, 0.94)), #fc5200;
  color: #ffffff;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.42);
  cursor: pointer;
  font-weight: 800;
  line-height: 1;
  backdrop-filter: blur(14px);
  transition:
    background 160ms ease,
    transform 160ms ease,
    border-radius 160ms ease;

  svg {
    width: 1.22rem;
    height: 1.22rem;
    flex: 0 0 auto;
  }

  &:hover,
  &:focus-visible {
    background:
      linear-gradient(135deg, rgba(255, 105, 36, 1), rgba(252, 82, 0, 1)), #fc5200;
    outline: none;
    transform: translateY(-1px);
  }

  @media screen and (max-width: 1023px) {
    position: relative;
    min-height: 2.8rem;
    margin-bottom: ${(props) => (props.$collapsed ? 0 : '0.7rem')};
  }

  @media screen and (max-width: 420px) {
    min-height: 2.8rem;
    min-width: 2.8rem;
    padding: 0 0.65rem;
  }
`;

const ActivitySummaryHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  gap: 0.45rem;
  width: 100%;
  min-width: 0;

  @media screen and (max-width: 600px) {
    gap: 0.38rem;
  }
`;

const ActivityTitle = styled.h3`
  width: 100%;
  min-width: 0;
  margin: 0;
  color: #ffffff;
  font-size: 1.05rem;
  line-height: 1.25;
  text-align: left;
  overflow-wrap: anywhere;
  word-break: break-word;

  @media screen and (max-width: 600px) {
    font-size: 0.98rem;
  }
`;

const ActivityDate = styled.time`
  display: block;
  width: 100%;
  min-width: 0;
  color: #cbd5e1;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;

  @media screen and (max-width: 600px) {
    font-size: 0.78rem;
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
  background: rgba(252, 84, 0, 0.63);
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  padding: 0 0.55rem;
  text-decoration: none;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(222, 220, 219, 0.94);
    color: black;
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
    font-size: clamp(0.98rem, 1.8vw, 1.25rem);
    line-height: 1.15;
    overflow-wrap: anywhere;
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
