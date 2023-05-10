import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
const Logout = () => {
  const token = localStorage.getItem('access_token');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    // remove token from state
    window.location.href = 'http://localhost:3000';
  };

  useEffect(() => {
    async function logout() {
      if (token) {
        setLoggedIn(true);
      }
    }
    logout();
  }, [token, loggedIn]);

  return (
    <>
      {loggedIn ? (
        <li>
          <StyledLoginButton to="/" onClick={handleLogout}>
            Logout
          </StyledLoginButton>
        </li>
      ) : (
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
  display: inline;
  min-width: 60px;
  background-color: #fc5200;
  height: 40px;
  width: 6%;
  text-align: center;
  margin-top: -7em;
  margin-left: 15rem;
  line-height: 40px;
  padding: 20px 20px;
  font-size: 12px;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  &:hover,
  &:focus {
    text-decoration: none;
    filter: brightness(1.1);
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
