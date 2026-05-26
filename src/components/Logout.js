import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Logout = () => {
  const token = localStorage.getItem('access_token');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    // remove token from state
    window.location.href = 'http://runolution.vercel.app';
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
        <StyledLoginButton href="/" onClick={handleLogout}>
          Logout
        </StyledLoginButton>
      )}
    </>
  );
};
export default Logout;

const StyledLoginButton = styled.a`
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.95rem;
  background: linear-gradient(135deg, #fc5200, #ff8a2a);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 0.85rem 1rem;
  line-height: 1;
  border-radius: 8px;
  text-align: center;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 12px 24px rgba(252, 82, 0, 0.28);
  transition:
    filter 0.2s ease,
    transform 0.2s ease;

  &:hover,
  &:focus {
    text-decoration: none;
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;
