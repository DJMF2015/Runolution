import React, { useState, useEffect } from 'react';

export default function ActivityDropDown(props) {
  const [activities, setActivityName] = useState([]);
  const styles = {
    display: 'flex',
    alignItems: 'center',
    margin: '0 auto',
    justifyContent: 'center',
    height: '3vh',
    width: '30vw',
    border: '2px solid black',
    borderRadius: '7px',
    FontFace: 'Montserrat',
    fontsize: '1.5rem',
  };

  useEffect(() => {
    let activityArray = props.result.map((activity) => {
      return activity.name;
    });
    activityArray.unshift('All Activities');
    setActivityName(activityArray);
  }, [props.result]);

  const setFilterByActivity = (e) => {
    props.setFilteredName(e.target.value);
  };

  return (
    <>
      <select style={styles} id="filterdropdown" onChange={setFilterByActivity}>
        {activities.map((Option) => (
          <option key={Option}>{Option}</option>
        ))}
      </select>
    </>
  );
}
