import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Logout = () => {
  const token = localStorage.getItem('access_token');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = 'strava-personal-dashboard.vercel.app';
  };

  useEffect(() => {
    async function logout() {
      if (token) {
        setLoggedIn(false);
      }
    }
    logout();
  }, [token, loggedIn]);

  return (
    <>
      {!loggedIn && (
        <li>
          <StyledLoginButton to="/" onClick={handleLogout}>
            Logout
          </StyledLoginButton>
        </li>
      )}
    </>
  );
};
export default Logout;

const StyledLoginButton = styled.a`
  font-size: 16px;
  background-color: #fc5200;
  border-color: #fc5200;
  height: auto;
  font-size: 12px;
  padding: 6px 16px;
  min-height: unset;
  line-height: normal;
  border-radius: 10px;
  text-align: center;
  color: #fff;
  font-weight: 600;
  &:hover,
  &:focus {
    text-decoration: none;
    filter: brightness(1.1);
    scale: 1.1;
  }

  @media (max-width: 768px) {
    display: none;
    margin-left: 0;
  }
  @media (max-width: 425px) {
    display: none;
    margin-left: 0;
  }
`;
