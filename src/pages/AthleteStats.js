import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import Login from './Login';
import {
  getKmsToMiles,
  getMilesToKms,
  getMetresToFeet,
  getNoOfMtEverests,
  getUnitsWithCommas,
} from '../utils/conversion';
const AthleteStats = () => {
  const [payload, setPayload] = useState([]);
  const [user, setUserData] = useState([]);

  useEffect(() => {
    const athlete = localStorage.getItem('athlete');
    const token = localStorage.getItem('access_token');
    const athleteId = JSON.parse(athlete) || {};
    const accessToken = JSON.parse(token);
    setPayload({
      athlete: athleteId?.id,
      athleteName: athleteId?.firstname + ' ' + athleteId?.lastname,
      athleteProfile: athleteId?.profile_medium,
      athleteClubs: athleteId?.clubs,
      athleteFollowers: athleteId?.follower_count,
      access_token: accessToken,
    });
  }, [payload.athlete, payload.access_token]);

  useEffect(() => {
    async function fetchData() {
      if (payload.athlete && payload.access_token) {
        await getAthleteStats(payload.athlete, payload.access_token).then((response) => {
          setUserData(response);
        });
      }
    }
    fetchData();
  }, [payload]);
  return (
    <div>
      {!user?.data ? (
        <Login />
      ) : (
        <div className="card">
          <div className="column">
            <img
              className="card-image"
              src={payload?.athleteProfile}
              alt="Avatar"
              style={{
                marginTop: '1rem',
                width: '7vw',
                borderRadius: '50%',
                height: '7vw',
              }}
            />
          </div>
          <div className="column">
            <h2 className="strava-header">All Time Totals</h2>

            <div className="row">
              <h4>{getKmsToMiles(user?.data?.all_run_totals?.distance)}</h4>
            </div>
            <div className="row">
              <h4> {getMilesToKms(user?.data?.all_run_totals?.distance)}</h4>
            </div>
            <div className="row">
              <h4> {'Runs: ' + user?.data?.all_run_totals?.count}</h4>
            </div>
            <div className="row">
              <h4>
                {' '}
                {getUnitsWithCommas(user?.data.all_run_totals.elevation_gain).concat(
                  ' mtrs'
                )}
              </h4>
            </div>
            <div className="row">
              <h4>
                {'No. of Everests: ' +
                  getNoOfMtEverests(user?.data.ytd_run_totals.elevation_gain)}
              </h4>
            </div>
            <div className="row">
              <h4>{getMetresToFeet(user?.data.all_run_totals.elevation_gain)}</h4>
            </div>
          </div>
          <div className="column">
            <h2 className="strava-header">Year To Date</h2>
            <div className="row">
              <h4>{getKmsToMiles(user?.data.ytd_run_totals.distance)} </h4>
            </div>
            <div className="row">
              <h4> {getMilesToKms(user?.data.ytd_run_totals.distance)} </h4>
            </div>
            <div className="row">
              <h4> {'Runs: ' + user?.data.ytd_run_totals.count}</h4>
            </div>
            <div className="row">
              <h4>
                {getUnitsWithCommas(user?.data.ytd_run_totals.elevation_gain).concat(
                  ' mtrs'
                )}
              </h4>
            </div>
            <div className="row">
              <h4>
                {' '}
                {'Mnt. Everests: ' +
                  getNoOfMtEverests(user?.data.ytd_run_totals.elevation_gain)}
              </h4>
            </div>
            <div className="row">
              <h4> {getMetresToFeet(user?.data.ytd_run_totals.elevation_gain)}</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteStats;
