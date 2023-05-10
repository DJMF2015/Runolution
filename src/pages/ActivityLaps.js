import React from 'react';
import ActivityList from '../components/ActivityList';
// import { useGetPB } from '../utils/hooks';
const ActivityLaps = (props) => {
  return (
    <div>
      {props && props?.lap ? (
        <div>
          <h3>{props?.lap?.average_speed}</h3>
          <h3>{props?.lap?.average_cadence}</h3>
          <h3>{props?.lap?.average_heartrate}</h3>
        </div>
      ) : (
        <div>
          <h1>no props</h1>
        </div>
      )}
    </div>
  );
};
export default ActivityLaps;
