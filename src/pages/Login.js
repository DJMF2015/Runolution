import React, { useState, useEffect, createContext } from 'react';
const Login = () => {
  const redirectUrl = 'http://localhost:3000/redirect';

  const handleLogin = () => {
    localStorage.clear();
    window.location = `http://www.strava.com/oauth/authorize?client_id=27989&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=read_all,activity:read_all,profile:read_all`;
  };

  const handleLogout = () => {
    localStorage.clear();
    // remove token from state
    window.location.href = 'http://localhost:3000/login';
  };

  return (
    <>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout}>Logout</button>
    </>
  );
};

export default Login;
