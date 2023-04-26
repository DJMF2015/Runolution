import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import Activities from './pages/AthleteActivities';
import AthleteStats from './pages/AthleteStats';
import AthleteClub from './pages/AthleteClub';
import Activity from './components/ActivityCard';
import Redirect from './utils/Redirect';
import Profile from './pages/Profile';
import Login from './pages/Login';
import ActivitiesMap from './pages/ActivitiesMap';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="/" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/redirect" element={<Redirect />} />
            <Route path="/statistics" element={<AthleteStats />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/map" element={<ActivitiesMap />} />
            <Route path="/club" element={<AthleteClub />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
