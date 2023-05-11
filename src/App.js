import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import Activities from './pages/AthleteActivities';
import ActivityList from './components/ActivityList';
import Activity from './components/ActivityCard';
import Redirect from './utils/redirect';
import Login from './pages/Login';
import ActivitiesMap from './pages/ActivitiesMap';
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="/" element={<Activities />} />
            <Route path="/login" element={<Login />} />
            <Route path="/redirect" element={<Redirect />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/splits" element={<ActivityList />} />
            <Route path="/map" element={<ActivitiesMap />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
