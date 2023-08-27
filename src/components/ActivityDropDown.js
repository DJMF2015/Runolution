import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
export default function ActivityDropDown(props) {
  const [sport, setActivityType] = useState([]);

  useEffect(() => {
    let activityArray = props.props.map((activity) => {
      return activity.activityType;
    });
    activityArray = [...new Set(activityArray)]; // remove duplicates
    activityArray.unshift('Sport Type');
    setActivityType(activityArray);
  }, [props.props]);

  const setFilterBySportType = (e) => {
    props.setFilterBySportType(e.target.value);
  };
  return (
    <>
      <DropDown id="filterdropdown" onChange={setFilterBySportType}>
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
  height: 3vh;
  background-color: white;
  width: 10vw;
  border: 2px solid black;
  border-radius: 7px;
  font-family: 'Montserrat';
  font-size: 1rem;

  @media screen and (max-width: 768px) {
    margin: 0 auto;
    margin-top: 7rem;
    margin-bottom: -5rem;
    width: 30vw;
    height: 5vh;
    font-size: 1rem;
    background-color: ${(props) => props.theme.colour.ghostwhite};
  }
`;
