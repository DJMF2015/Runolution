import { Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import LogoutButton from '../components/Logout';
import PoweredByStrava from '../pwrdBy_strava_light.svg';
import styled from 'styled-components';
import '../styles/Navbar.css';
import AthleteStats from './AthleteStats';
const Layout = () => {
  const athlete = JSON.parse(localStorage.getItem('athlete'));
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  console.log({ athlete });
  return (
    <>
      <nav className="navigation">
        <a href="/" className="name">
          {athlete ? <ImageLogo src={athlete?.profile_medium} alt="user_logo" /> : ''}
        </a>
        {athlete ? (
          <>
            <AthleteName>{athlete?.firstname + ' ' + athlete?.lastname}</AthleteName>
            <AthleteFollowers>
              {athlete?.follower_count > 0 && athlete?.follower_count + ' followers'}
            </AthleteFollowers>
          </>
        ) : (
          ''
        )}

        <img
          src={PoweredByStrava}
          alt="powered_by_strava"
          className="powered_by_strava"
        />

        <button
          className="hamburger"
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
              <Link to="/">Personal Activities</Link>
            </LinksList>
            <LinksList>
              <Link to="/map">Personal HeatMap</Link>
            </LinksList>
            <LinksList>
              <LogoutButton />
            </LinksList>
          </ul>
        </div>
      </nav>
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

const AthleteName = styled.h3`
  color: #fff;
  font-size: 1rem;
  margin: 0 0 20px 10px;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 0 0 20px 10px;
  }

  @media (max-width: 425px) {
    font-size: 0.6rem;
    margin: 0 0 20px 10px;
  }
`;

const AthleteFollowers = styled.h3`
  color: #fff;
  font-size: 1rem;
  margin: 30px 0 0px -97px;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 30px 0 0px -80px;
  }

  @media (max-width: 425px) {
    font-size: 0.6rem;
    margin: 20px 0 0px -60px;
  }
`;

const AthleteClubs = styled.h4`
  color: #fff;
  font-size: 0.7rem;
  margin: 15px 10px 10px 90px; //
`;

const LinksList = styled.li`
  color: white;
  margin: 0 0 0 10px;
  font-size: 1rem;
`;
