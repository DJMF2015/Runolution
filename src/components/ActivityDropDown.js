import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
export default function ActivityDropDown(props) {
  const [sport, setActivityType] = useState([]);
  useEffect(() => {
    let activityArray = props.props.map((activity) => {
      return activity.activityType ? activity.activityType : activity.sport_type;
    });
    activityArray = [...new Set(activityArray)]; // remove duplicates
    activityArray.unshift('Sport Type');
    setActivityType(activityArray);
  }, [props.props]);

  const setFilterBySportType = (e) => {
    props.setFilterBySportType(e.target.value === 'Sport Type' ? null : e.target.value);
  };

  return (
    <>
      <DropDown
        id="filterdropdown"
        className={props.className}
        onChange={setFilterBySportType}
      >
        {sport.map((Option) => (
          <option key={Option}>{Option}</option>
        ))}
      </DropDown>
    </>
  );
}

const DropDown = styled.select`
  display: flex;
  align-items: center;
  margin: 0 auto;
  justify-content: center;
  height: 4vh;
  background-color: white;
  width: 12vw;
  border: 2px solid black;
  border-radius: 7px;
  font-family: 'Montserrat';
  font-size: 1rem;
`;
