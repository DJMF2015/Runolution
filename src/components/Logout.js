import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Logout = () => {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(true);

  const handleLogout = () => {
    localStorage.clear();
    setLoggedIn(false);
    navigate('/');
  };

  return (
    <>
      {!loggedIn && (
        <li>
          <StyledLoginButton onClick={handleLogout}>Logout</StyledLoginButton>
        </li>
      )}
    </>
  );
};
export default Logout;

const StyledLoginButton = styled.a`
  font-size: 14px;
  background-color: #fc5200;
  border-color: #fc5200;
  height: auto;
  margin-left: 1rem;
  padding: 0.5rem 0.8rem;
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
