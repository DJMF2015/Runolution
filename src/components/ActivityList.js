import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSecondstoMinutes, getKmsToMiles, getMstoKmHr } from '../utils/conversion';
export default function ActivityList() {
  const location = useLocation();

  const navigate = useNavigate();
  const { from } = location.state;
  if (!location.state) {
    navigate('/activities');
  }

  const handleGoBack = () => {
    navigate(-1);
  };
  console.log(from);
  return (
    <>
      <Container>
        <Heading>
          <th>Splits</th>
          <th>Distance</th>
          <th>Elevation Gain (mtrs)</th>
          <th>Elapsed Time</th>
          <th>Average Speed</th>
          <th>Average Cadence</th>
          <th>Average Heartrate</th>

          <th>Max Heartrate</th>
          <th>Pace Zone</th>
        </Heading>
        <Wrapper>
          {from ? (
            from.map((lap, i) => {
              return (
                <>
                  {/* <span key={`${lap.id}--${lap.moving_time}`}>{`Lap ${i + 1}`}</span> */}
                  <div>{lap?.name}</div>
                  <div>{getKmsToMiles(lap?.distance)}</div>
                  <div>{lap?.total_elevation_gain}</div>
                  <div>{getSecondstoMinutes(lap?.elapsed_time)}</div>
                  <div>{getMstoKmHr(lap?.average_speed)}</div>
                  <div>{lap?.average_cadence}</div>
                  <div>{lap.average_heartrate}</div>
                  <div>{lap?.max_heartrate}</div>
                  <div>{lap?.pace_zone}</div>
                </>
              );
            })
          ) : (
            <td>no data</td>
          )}
        </Wrapper>
      </Container>
      {/* render all splits and name from props */}
      <h3 style={{ textAlign: 'center' }}>Splits</h3>

      <button onClick={handleGoBack} style={{ textAlign: 'center', marginLeft: '49vw' }}>
        Back
      </button>
    </>
  );
}

const Container = styled.div`
  margin-top: 0.5em;
  margin: 0.75rem;
  border-radius: 5px;
  border: 1px solid black;
  box-sizing: border-box;
  box-shadow: 0 3px 8px rgba(0, 0, 1, 0.5);
  width th {
    background-color: #f2f2f2;
    color: black;
    padding: 0.5em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
`;

// display data in 7 columns with 7 rows
const Wrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(5, 1fr);
  grid-gap: 1em;
  padding: 0.5em;
  text-align: left;
  border-bottom: 1px solid #ddd;

  /* style rows with odd even background color */
  div {
    border-bottom: 1px solid #ddd;
    padding: 0.2em;
  }
  /* layout as a stack on top of one another */
  @media screen and (max-width: 768px) {
    display: grid;
    font-size: 14px;
    margin-top: 0.5em;
    border-radius: 5px;
    padding: 0.5em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
`;

const Heading = styled.div`
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-gap: 0.5em;
  padding: 0.5em;
  text-align: left;

  th {
    @media screen and (max-width: 768px) {
      grid-template-columns: repeat(9, 1fr);
      grid-template-rows: repeat(8, 1fr);
      font-size: 12px;
      grid-gap: 0.5em;
      padding: 0.5em;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
  }
`;
