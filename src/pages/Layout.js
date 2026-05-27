import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LogoutButton from '../components/Logout';
import PoweredByStrava from '../powered_by_strava_light.svg';
import styled from 'styled-components';
import '../styles/Navbar.css';

const Layout = () => {
  const [athlete, setAthleteData] = useState([]);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const location = useLocation();
  const isActivitiesPage = location.pathname === '/';
  const isActivityCardPage = location.pathname === '/activity';
  const isActivityListPage = location.pathname === '/splits';
  const isActivitiesMapPage = location.pathname === '/map';
  const showTopBar = !isActivitiesMapPage;
  const showPoweredByStrava = isActivitiesPage;
  const showTitle = !isActivityListPage;
  const navigationLayerClasses = [
    'navigation-layer',
    isActivitiesPage ? 'navigation-layer--activities' : '',
    isActivityCardPage ? 'navigation-layer--activity-card' : '',
    isActivityListPage ? 'navigation-layer--activity-list' : '',
    isActivitiesMapPage ? 'navigation-layer--map-menu-only' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    const athlete = JSON.parse(localStorage.getItem('athlete'));
    setAthleteData(athlete);
  }, []);

  useEffect(() => {
    setIsNavExpanded(false);
  }, [location.pathname]);

  return (
    <>
      <span className={navigationLayerClasses}>
        <nav className="navigation" aria-label="Primary navigation">
          {showTopBar && (
            <>
              <a href="/" className="name">
                {athlete && <ImageLogo src={athlete?.profile_medium} alt="user_logo" />}
              </a>
              {athlete && (
                <AthleteMeta>
                  <AthleteName>
                    {athlete?.firstname + ' ' + athlete?.lastname}
                  </AthleteName>
                  <AthleteFollowers>
                    {athlete?.follower_count > 0 &&
                      athlete?.follower_count + ' followers'}
                  </AthleteFollowers>
                </AthleteMeta>
              )}

              {showPoweredByStrava && (
                <img
                  src={PoweredByStrava}
                  alt="powered_by_strava"
                  className="powered_by_strava"
                />
              )}

              {showTitle && <Title>Runolution</Title>}
            </>
          )}

          <button
            type="button"
            className="hamburger"
            aria-label="Toggle navigation menu"
            aria-expanded={isNavExpanded}
            onClick={() => {
              setIsNavExpanded(!isNavExpanded);
            }}
          >
            <svg
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <div className={isNavExpanded ? 'navigation-menu expanded' : 'navigation-menu'}>
            <ul>
              <LinksList>
                <Link to="/" onClick={() => setIsNavExpanded(false)}>
                  Personal Activities
                </Link>
              </LinksList>
              <LinksList>
                <Link to="/map" onClick={() => setIsNavExpanded(false)}>
                  Personal Heatmap
                </Link>
              </LinksList>
              <LinksList>
                <LogoutButton />
              </LinksList>
              {showPoweredByStrava && (
                <li className="navigation-menu__strava">
                  <img
                    src={PoweredByStrava}
                    alt="powered_by_strava"
                    className="powered_by_strava"
                  />
                </li>
              )}
            </ul>
          </div>
        </nav>
      </span>
      <Outlet />
    </>
  );
};

export default Layout;

const ImageLogo = styled.img`
  display: flex;
  position: relative;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  margin: 0 0 0 10px;

  &:hover {
    cursor: pointer;
    scale: 1.15;
  }

  @media (max-width: 768px) {
    width: 45px;
    height: 45px;
    margin: 0 0 0 10px;
  }

  @media (max-width: 425px) {
    width: 35px;
    height: 35px;
    margin: 0 0 0 10px;
  }
`;

const Title = styled.span`
  color: white;
  margin: 0 auto;
  font-family: Arial;
  font-size: 1.5rem;
  font-weight: bold;
  font-style: italic;
  letter-spacing: 0.08rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
    display: none;
  }

  @media (max-width: 468px) {
    display: none;
  }
`;

const AthleteMeta = styled.div`
  display: flex;
  min-width: 0;
  max-width: min(28vw, 18rem);
  flex-direction: column;
  gap: 0.18rem;
  color: #fff;

  @media (max-width: 768px) {
    max-width: calc(100vw - 15.5rem);
  }

  @media (max-width: 560px) {
    max-width: calc(100vw - 11.5rem);
  }

  @media (max-width: 425px) {
    max-width: calc(100vw - 9rem);
  }
`;

const AthleteName = styled.h3`
  color: #fff;
  font-size: 0.98rem;
  line-height: 1.15;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 0.86rem;
  }

  @media (max-width: 425px) {
    font-size: 0.78rem;
  }
`;

const AthleteFollowers = styled.h3`
  color: #fff;
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.15;
  margin: 0;
  opacity: 0.78;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 0.72rem;
  }

  @media (max-width: 425px) {
    font-size: 0.68rem;
  }
`;

const LinksList = styled.li`
  color: white;
  font-size: 1rem;
`;
