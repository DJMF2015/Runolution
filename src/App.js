import React from 'react';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import Activities from './pages/AthleteActivities';
import ActivityList from './components/ActivityList';
import Redirect from './utils/redirect';
import Login from './pages/Login';
import ActivitiesMap from './pages/ActivitiesMap';
import ActivitiesCard from './components/ActivitiesCard';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout />
        <Routes>
          <Route path="/" element={<Activities />} />
          <Route path="/login" element={<Login />} />
          <Route path="/redirect" element={<Redirect />} />
          <Route path="/activity" element={<ActivitiesCard />} />
          <Route path="/splits" element={<ActivityList />} />
          <Route path="/map" element={<ActivitiesMap />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
