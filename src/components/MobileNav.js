import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
// import MobileNavLinks from './MobileNavLinks';
import { Navigation } from '@styled-icons/fluentui-system-filled/Navigation';
import { Cross } from '@styled-icons/icomoon/Cross';
// import HamburgerStyles from '../styles/HamburgerMenu.module.css';

const MobileNav = () => {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const handleToggle = () => {
    setNavbarOpen(!navbarOpen);
  };

  return (
    <>
      <HamburgerMenu clicked={navbarOpen} onClick={handleToggle}>
        {navbarOpen ? (
          <>
            <CrossButton />
            <MobileNavLinksUL>
              <Link to="/">Personal Activities</Link>
              <Link to="/map">HeatMap</Link>
            </MobileNavLinksUL>
          </>
        ) : (
          <HamburgerIcon />
        )}
      </HamburgerMenu>
    </>
  );
};

const HamburgerIcon = styled(Navigation)`
  position: fixed;
  max-height: 2rem;
  max-width: 2rem;
  right: 3rem;
  margin-top: 50px;
  top: 2em;
  color: red;
`;

const HamburgerMenu = styled.div`
  color: black;
  position: relative;
  display: inline-flex;
  height: 100vh;
  width: 400px;
  z-index: 999;
  margin-left: 6.5rem;
  float: right;
  background-color: ${(props) => (props.clicked ? 'white' : 'transparent')};

  border-left: ${(props) => (props.clicked ? '1px solid black' : 'none')};
  left: 10px;
  top: 0px;
  z-index: 1;
`;

const MobileNavLinksUL = styled.div`
  display: flex;
  flex-direction: column;

  padding: 1px;
  color: white;
  list-style-type: none;
  font-size: 1.2em;
  color: ${(props) => props.theme.colour.red};
  a {
    &:hover,
    &:focus {
      text-decoration: underline;
      color: red;
    }
  }
`;

const CrossButton = styled(Cross)`
  position: relative;
  display: inline-flex;
  max-height: 2rem;
  max-width: 2rem;
  left: 20rem;
  top: 1rem;
  align-items: flex-end;
`;
export default MobileNav;
