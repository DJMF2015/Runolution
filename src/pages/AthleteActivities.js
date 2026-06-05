import React, { useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGetWindowWidth } from '../hooks/useWindowWidth';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useScroll } from '../hooks/useScroll';
import { clearStravaAuth, hasStoredData, isUnauthorizedError } from '../utils/helpers';
import {
  fetchData,
  fetchTokenInfo,
  initializeUserDetails,
} from '../utils/athleteActivitiesFunctions';
import LoadingWheel from '../styles/Loading.module.css';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
import { Activity } from '@styled-icons/evaicons-solid/Activity';
import { getKmsToMiles, getSecondstoMinutes, formattedDate } from '../utils/conversion';
import StravaMetricsChart from '../components/RelativeEffortChart';
import ActivityDropDown from '../components/ActivityDropDown';
import Login from '../components/Login';
import Search from '../components/search';
import BreakdownChart from '../components/BreakdownChart';
import '../App.css';
import { Link } from 'react-router-dom';
import AthleteStats from '../components/AthleteStats';
import Pagination from '../utils/pagination';

const initialState = {
  activities: [],
  loading: false,
  activityLoadingState: null,
};

const RESULTS_PER_PAGE = 20;
const AthleteActivities = () => {
  const { windowWidth } = useGetWindowWidth();
  const { isVisible, scrollToTop } = useScroll();
  const [filteredSportType, setFilteredSportType] = useState(null);
  const [athlete, setAthlete] = useState(null);
  const [paginationIndex, setPaginationIndex] = useState(1);
  const [searchTxt, setSearchTxt] = useState('');
  const [state, setState] = useState(initialState);
  const [authError, setAuthError] = useState(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const { hasLoadedFromStorage } = useLocalStorageState({
    key: 'activities',
    state,
    setState,
    stateKey: 'activities',
  });

  const access_token = JSON.parse(localStorage.getItem('access_token'));
  const activitiesLoaded = state.activities.length > 0;
  const hasStoredActivities = hasStoredData('activities');
  const canRenderCachedActivities =
    activitiesLoaded || (!access_token && hasStoredActivities);

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

  const handleAuthError = useCallback((error) => {
    if (!isUnauthorizedError(error)) {
      console.error(error);
      return false;
    }

    clearStravaAuth();
    setAthlete(null);
    setAuthError('Your Strava session has expired. Please connect again.');
    setState((prevState) => ({
      ...prevState,
      loading: false,
      activityLoadingState: null,
    }));
    return true;
  }, []);

  useEffect(() => {
    if (!isOnline) {
      const storedAthlete = JSON.parse(localStorage.getItem('athlete'));
      setAthlete(storedAthlete);
      return;
    }

    async function loadAthlete() {
      try {
        const payload = await fetchTokenInfo();
        if (!payload) {
          return;
        }

        const athleteDetails = await initializeUserDetails(payload);
        if (athleteDetails) {
          setAthlete(athleteDetails);
          return;
        }
      } catch (error) {
        handleAuthError(error);
        return;
      }

      const storedAthlete = JSON.parse(localStorage.getItem('athlete'));

      setAthlete(storedAthlete);
    }
    loadAthlete();
  }, [handleAuthError, isOnline]);

  useEffect(() => {
    if (!access_token || !hasLoadedFromStorage || !isOnline) {
      return;
    }
    if (activitiesLoaded) {
      return;
    }

    async function loadActivities() {
      try {
        const currentAccessToken = await fetchTokenInfo();
        if (!currentAccessToken) {
          return;
        }

        let stravaActivityResponse = await fetchData(
          currentAccessToken,
          (loading) => setState((prev) => ({ ...prev, loading })),
          (count) => setState((prev) => ({ ...prev, activityLoadingState: count })),
        );
        setState((prevState) => ({
          ...prevState,
          activities: stravaActivityResponse,
          loading: false,
        }));
      } catch (error) {
        if (!handleAuthError(error)) {
          setState((prevState) => ({
            ...prevState,
            loading: false,
          }));
        }
      }
    }

    loadActivities();
  }, [access_token, activitiesLoaded, handleAuthError, hasLoadedFromStorage, isOnline]);

  useEffect(() => {
    setPaginationIndex(1);
  }, [searchTxt, filteredSportType]);

  const onPageChange = (pageIndex) => {
    if (typeof pageIndex === 'number' && !isNaN(pageIndex)) {
      setPaginationIndex(pageIndex);
    }
  };

  let filteredActivities = [...state.activities];
  if (searchTxt.trim()) {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity?.name?.toLowerCase().includes(searchTxt.toLowerCase());
    });
  }

  if (filteredSportType) {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.sport_type === filteredSportType;
    });
  }

  const paginatedActivities = filteredActivities.slice(
    (paginationIndex - 1) * RESULTS_PER_PAGE,
    paginationIndex * RESULTS_PER_PAGE,
  );

  if (state.loading && access_token) {
    return (
      <div className={LoadingWheel.screen}>
        <div className={LoadingWheel.panel}>
          <div className={LoadingWheel.indicator} aria-hidden="true">
            <div className={LoadingWheel.loading}></div>
          </div>
          <h1 className={LoadingWheel.title}>Loading activities</h1>
          <p className={LoadingWheel.message}>
            Preparing{' '}
            <span className={LoadingWheel.count}>{state.activityLoadingState || 0}</span>{' '}
            Strava activities for your dashboard.
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
    <PageContainer>
      {!access_token && !canRenderCachedActivities ? (
        <>
          {authError && <AuthMessage>{authError}</AuthMessage>}
          <Login />
        </>
      ) : (
        <>
          {isVisible && <ScrollToTop alt="Go to top" onClick={scrollToTop} />}

          <DashboardLayout>
            <DashboardSidebar>
              <SidebarText>Filter your Strava activities</SidebarText>

              <SidebarControl>
                <Search
                  searchTxt={searchTxt}
                  updateSearchTxt={setSearchTxt}
                  placeholder="Search all activities"
                />
              </SidebarControl>

              <SidebarControl>
                <ActivityDropDown
                  props={state.activities}
                  setFilterBySportType={setFilteredSportType}
                />
              </SidebarControl>
            </DashboardSidebar>

            <DashboardMain>
              {!isOnline && (
                <OfflineNotice>
                  <OfflineTitle>Internet connection required</OfflineTitle>
                  <OfflineText>
                    Athlete stats and activity details need a network connection.
                    Reconnect to refresh Strava data and open activity maps.
                  </OfflineText>
                </OfflineNotice>
              )}

              {isOnline && athlete?.id && (
                <AthleteStats
                  activities={state.activities}
                  athlete={athlete}
                  onAuthError={handleAuthError}
                />
              )}
              {isOnline && (
                <BreakdownChart props={state.activities} onAuthError={handleAuthError} />
              )}
              {isOnline && (
                <DashboardChartArea>
                  <StravaMetricsChart activities={state.activities} />
                </DashboardChartArea>
              )}

              {!isOnline ? (
                <OfflineTablePlaceholder>
                  <OfflineTitle>Activities are unavailable offline</OfflineTitle>
                  <OfflineText>
                    Connect to the internet to view the activity table and open activity
                    detail pages.
                  </OfflineText>
                </OfflineTablePlaceholder>
              ) : windowWidth >= 700 ? (
                <DesktopOnly>
                  <ActivitiesTableContainer>
                    <TableHeader>
                      <TableTitleGroup>
                        <TableTitle>Recent Activities</TableTitle>
                        <TableSubtitle>
                          Select an activity name to open its map view.
                        </TableSubtitle>
                      </TableTitleGroup>
                    </TableHeader>

                    <Table>
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Sport</th>
                          <th>Date</th>
                          <th>Distance</th>
                          <th>Time</th>
                          <th>Elev Gain</th>
                          <th>Avg HR</th>
                          <th>Kudos</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedActivities.map((activity) => (
                          <TableRow key={activity.id}>
                            <ActivityCell>
                              <ActivityIcon type={activity.sport_type} />

                              <ActivityInfo>
                                <ActivityTitle>
                                  {activity.map?.summary_polyline ? (
                                    <ActivityLink
                                      to="/activity"
                                      state={{ from: activity }}
                                      aria-label={`Open ${activity.name} activity map`}
                                    >
                                      <span>{activity.name}</span>
                                      <OpenHint>Open</OpenHint>
                                    </ActivityLink>
                                  ) : (
                                    <UnavailableActivityName>
                                      {activity.name}
                                    </UnavailableActivityName>
                                  )}
                                </ActivityTitle>

                                <ActivityDate>
                                  {formattedDate(activity.start_date)}
                                </ActivityDate>
                              </ActivityInfo>
                            </ActivityCell>

                            <SportCell>{activity.sport_type}</SportCell>
                            <DateCell>{formattedDate(activity.start_date)}</DateCell>
                            <DistanceCell>
                              {getKmsToMiles(activity.distance)}
                            </DistanceCell>
                            <TimeCell>
                              {getSecondstoMinutes(activity.moving_time)}
                            </TimeCell>
                            <ElevationCell>{activity.total_elevation_gain}</ElevationCell>
                            <HRCell>{activity.average_heartrate || '—'}</HRCell>
                            <KudosCell>{activity.kudos_count}</KudosCell>
                          </TableRow>
                        ))}
                      </tbody>
                    </Table>
                  </ActivitiesTableContainer>

                  <Pagination
                    onPageChange={onPageChange}
                    paginationIndex={paginationIndex}
                    totalPages={Math.ceil(filteredActivities.length / RESULTS_PER_PAGE)}
                  />
                </DesktopOnly>
              ) : (
                <MobileOnly>
                  <MobileActivitiesList>
                    {paginatedActivities.map((activity) => (
                      <MobileActivityCard key={activity.id}>
                        <MobileActivityHeader>
                          <MobileActivityTitle>
                            {activity.map?.summary_polyline ? (
                              <MobileActivityLink
                                to="/activity"
                                state={{ from: activity }}
                                aria-label={`Open ${activity.name} activity map`}
                              >
                                <span>{activity.name}</span>
                                <MobileOpenHint>Open map</MobileOpenHint>
                              </MobileActivityLink>
                            ) : (
                              <UnavailableActivityName>
                                {activity.name}
                              </UnavailableActivityName>
                            )}
                          </MobileActivityTitle>

                          <SportBadge>{activity.sport_type}</SportBadge>
                        </MobileActivityHeader>

                        <MobileActivityDate>
                          {formattedDate(activity.start_date)}
                        </MobileActivityDate>

                        <MobileActivityDetails>
                          <DetailItem>
                            <DetailLabel>Distance</DetailLabel>
                            <DetailValue>{getKmsToMiles(activity.distance)}</DetailValue>
                          </DetailItem>

                          <DetailItem>
                            <DetailLabel>Time</DetailLabel>
                            <DetailValue>
                              {getSecondstoMinutes(activity.moving_time)}
                            </DetailValue>
                          </DetailItem>

                          <DetailItem>
                            <DetailLabel>Elevation</DetailLabel>
                            <DetailValue>{activity.total_elevation_gain}</DetailValue>
                          </DetailItem>
                        </MobileActivityDetails>

                        <MobileActivityFooter>
                          <DetailItem>
                            <DetailLabel>Avg HR</DetailLabel>
                            <DetailValue>{activity.average_heartrate || '—'}</DetailValue>
                          </DetailItem>

                          <DetailItem>
                            <DetailLabel>Kudos</DetailLabel>
                            <DetailValue>{activity.kudos_count}</DetailValue>
                          </DetailItem>
                        </MobileActivityFooter>
                      </MobileActivityCard>
                    ))}
                  </MobileActivitiesList>

                  <Pagination
                    onPageChange={onPageChange}
                    paginationIndex={paginationIndex}
                    totalPages={Math.ceil(filteredActivities.length / RESULTS_PER_PAGE)}
                  />
                </MobileOnly>
              )}
            </DashboardMain>
          </DashboardLayout>
        </>
      )}
    </PageContainer>
  );
};
export default AthleteActivities;

const DesktopOnly = styled.div`
  display: block;

  @media screen and (max-width: 699px) {
    display: none;
  }
`;

const MobileOnly = styled.div`
  display: none;

  @media screen and (max-width: 699px) {
    display: block;
  }
`;

const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  right: 0rem;
  color: ${(props) => props.theme.colour.strava};
  display: flex;
  z-index: 1;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  margin: 80vh 10px 40px 90vw;

  @media screen and (max-width: 750px) {
    top: 5rem;
    right: 0rem;
  }
`;

const ActivityIcon = styled(Activity)`
  height: 2.5em;
  width: 2.5em;
  color: ${(props) => props.theme.colour.strava};
  margin: 0px 5px 0px 0px;

  @media screen and (max-width: 750px) {
    width: 1em;
    height: 2em;
  }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  width: 100%;
  max-width: none;
  background: #071018;
  color: white;
  padding-top: 5.25rem;
  padding-bottom: 3rem;
  overflow-x: hidden;

  @media screen and (max-width: 768px) {
    padding-top: 4.35rem;
  }
`;

const AuthMessage = styled.div`
  position: fixed;
  top: 5.5rem;
  left: 50%;
  z-index: 1100;
  width: min(90vw, 34rem);
  transform: translateX(-50%);
  border: 1px solid rgba(252, 82, 0, 0.45);
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.96);
  color: #ffffff;
  padding: 0.85rem 1rem;
  text-align: center;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
`;

const OfflineNotice = styled.section`
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 1rem;
  border: 1px solid rgba(252, 82, 0, 0.45);
  border-radius: 12px;
  background: rgba(31, 41, 55, 0.95);
  color: #ffffff;
  padding: 1rem;
`;

const OfflineTablePlaceholder = styled(OfflineNotice)`
  min-height: 14rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 1.5rem;
`;

const OfflineTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 800;
`;

const OfflineText = styled.p`
  margin: 0.45rem 0 0;
  color: #cbd5e1;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const DashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 1.5rem;
  width: 100%;
  min-height: calc(100vh - 80px);
  margin: 0;
  padding: 1.5rem;
  padding-top: 0;
  box-sizing: border-box;
  background: #071018;

  @media screen and (max-width: 980px) {
    grid-template-columns: 1fr;
    padding: 1rem;
    padding-top: 0;
    position: sticky;
  }

  @media screen and (max-width: 560px) {
    padding: 0.75rem;
    position: sticky;
  }
`;

const DashboardSidebar = styled.aside`
  background: rgba(31, 41, 55, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 1rem;
  height: fit-content;
  position: sticky;
  top: 6rem;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  box-sizing: border-box;

  @media screen and (max-width: 980px) {
    position: static;
    display: grid;
    margin-top: 0;
    grid-template-columns: 1fr;
    gap: 0.55rem;
    align-items: end;
  }

  @media screen and (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

const SidebarText = styled.p`
  margin: 0.35rem 0 1rem;
  color: #cbd5e1;
  font-size: 0.86rem;

  @media screen and (max-width: 980px) {
    grid-column: 1 / -1;
    margin-bottom: 0.25rem;
  }
`;

const SidebarControl = styled.div`
  margin-bottom: 0.85rem;

  input {
    width: 100%;
    min-height: 52px;
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: rgba(255, 255, 255, 0.96);
    color: #111827;
    padding: 0 0.85rem;
    font-size: 0.95rem;
    outline: none;
  }
  select {
    width: 100%;
    min-height: 42px;
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: rgba(255, 255, 255, 0.96);
    color: #111827;
    padding: 0 0.85rem;
    font-size: 0.95rem;
    outline: none;
    @media screen and (max-width: 980px) {
      display: none;
    }
  }

  input:focus,
  select:focus {
    border-color: #fc5200;
    box-shadow: 0 0 0 3px rgba(252, 82, 0, 0.18);
  }

  @media screen and (max-width: 980px) {
    margin-bottom: 0;
  }
`;

const DashboardMain = styled.main`
  margin-top: 0;
  min-width: 0;
  width: 100%;
  background: #071018;
`;

const DashboardChartArea = styled.section`
  margin-top: 1.25rem;
  margin-bottom: 1.5rem;

  @media screen and (max-width: 980px) {
    display: none;
  }
`;

const ActivitiesTableContainer = styled.div`
  background-color: #222;
  border-radius: 12px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  margin-top: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-sizing: border-box;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #333;
`;

const TableTitleGroup = styled.div`
  display: grid;
  gap: 0.25rem;
`;

const TableTitle = styled.h2`
  color: #fff;
  font-size: 1.2rem;
  margin: 0;
`;

const TableSubtitle = styled.p`
  margin: 0;
  color: #cbd5e1;
  font-size: 0.86rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: #ccc;

  thead {
    background-color: #1a1a1a;
    border-bottom: 2px solid #333;
  }

  th {
    padding: 15px;
    text-align: left;
    font-weight: 600;
    color: #fff;
    font-size: 0.85rem;
    text-transform: uppercase;
  }

  td {
    padding: 15px;
    border-bottom: 1px solid #333;
    font-size: 0.9rem;
  }

  tbody tr {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #2a2a2a;
    }
  }
`;
const TableRow = styled.tr``;

const ActivityCell = styled.td`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ActivityInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ActivityTitle = styled.span`
  color: #fff;
  font-weight: 500;
`;

const ActivityLink = styled(Link)`
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
  color: #ffffff;
  text-decoration: none;
  font-weight: 800;
  line-height: 1.25;
  transition:
    color 160ms ease,
    transform 160ms ease;

  span:first-child {
    border-bottom: 2px solid rgba(252, 82, 0, 0.58);
  }

  &:hover,
  &:focus-visible {
    color: #ff8a4c;
    outline: none;
    transform: translateX(2px);
  }

  &:focus-visible span:first-child {
    box-shadow: 0 0 0 3px rgba(252, 82, 0, 0.24);
    border-radius: 4px;
  }
`;

const OpenHint = styled.span`
  flex: 0 0 auto;
  padding: 0.18rem 0.48rem;
  border: 1px solid rgba(252, 82, 0, 0.55);
  border-radius: 999px;
  background: rgba(252, 82, 0, 0.16);
  color: #ffb088;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const UnavailableActivityName = styled.span`
  color: #cbd5e1;
`;

const ActivityDate = styled.span`
  color: #888;
  font-size: 0.8rem;
`;

const SportCell = styled.td`
  color: #ff6b35;
  font-weight: 500;
`;

const DateCell = styled.td``;

const DistanceCell = styled.td``;

const TimeCell = styled.td``;

const ElevationCell = styled.td``;

const HRCell = styled.td``;

const KudosCell = styled.td`
  color: #ff6b35;
  font-weight: 500;
`;

// Mobile Styles
const MobileActivitiesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 80px;
`;

const MobileActivityCard = styled.div`
  background-color: #222;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #333;
  transition: all 0.2s ease;

  &:active {
    background-color: #2a2a2a;
    transform: scale(0.98);
  }
`;

const MobileActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
`;

const MobileActivityTitle = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1rem;
  flex: 1;
`;

const MobileActivityLink = styled(Link)`
  display: grid;
  gap: 0.45rem;
  color: #ffffff;
  text-decoration: none;
  font-weight: 800;

  span:first-child {
    text-decoration: underline;
    text-decoration-color: rgba(252, 82, 0, 0.8);
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  &:hover,
  &:focus-visible {
    color: #ff8a4c;
    outline: none;
  }
`;

const MobileOpenHint = styled.span`
  width: fit-content;
  padding: 0.28rem 0.62rem;
  border-radius: 999px;
  background: rgba(252, 82, 0, 0.2);
  border: 1px solid rgba(252, 82, 0, 0.62);
  color: #ffb088;
  font-size: 0.72rem;
  font-weight: 900;
`;

const SportBadge = styled.span`
  background-color: #ff6b35;
  color: #000;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
`;

const MobileActivityDate = styled.p`
  color: #888;
  font-size: 0.85rem;
  margin: 0 0 12px 0;
`;

const MobileActivityDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #333;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
`;

const DetailValue = styled.span`
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
`;

const MobileActivityFooter = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;
