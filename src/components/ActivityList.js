import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSecondstoMinutes, getKmsToMiles, getMstoKmHr } from '../utils/conversion';
import { getDetailedAthleteData } from '../utils/functions';
import { useScroll } from '../utils/hooks';
import StravaEmbed from '../components/StravaEmbed';
import PaceZoneBarChart from './BestEffortsChart';
import ElevationChart from './ElevationBarChart';
import { useEffect, useState } from 'react';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';
export default function ActivityList() {
  const location = useLocation();
  const [detailedActivity, setDetailedActivity] = useState([]);
  const { isVisible, scrollToTop } = useScroll();
  const navigate = useNavigate();
  const { from } = location.state;

  if (!location.state) {
    navigate('/activities');
  }

  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const token = JSON.parse(accessToken);
    getDetailedAthleteData(from?.id, token).then((response) => {
      setDetailedActivity(response.data);
    });
  }, [from]);

  return (
    <>
      {isVisible && (
        <div onClick={scrollToTop}>
          <ScrollToTop alt="Go to top"></ScrollToTop>
        </div>
      )}

      <PaceZoneBarChart props={detailedActivity} />

      <ElevationChart props={detailedActivity} />

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
          {detailedActivity &&
            detailedActivity?.laps &&
            detailedActivity.laps.map((lap, i) => {
              return (
                <>
                  <>
                    <div>{from.name}</div>
                    <div>{getKmsToMiles(lap.distance)}</div>
                    <div>{lap.total_elevation_gain}</div>
                    <div>{getSecondstoMinutes(lap.elapsed_time)}</div>
                    <div>{getMstoKmHr(lap?.average_speed)}</div>
                    <div>{lap.average_cadence}</div>
                    <div>{lap.average_heartrate}</div>
                    <div>{lap.max_heartrate}</div>
                    <div>{lap.pace_zone}</div>
                  </>
                </>
              );
            })}
        </Wrapper>
      </Container>

      <Container>
        <Table>
          <thead>
            <th style={{ color: 'red' }}>Segment Efforts</th>
            <tr>
              <TableHeader>Name</TableHeader>
              <TableHeader>Distance</TableHeader>
              <TableHeader>Max Grade</TableHeader>
              <TableHeader>Average Grade</TableHeader>
              <TableHeader>Elapsed Time</TableHeader>
              <TableHeader>Average Heartrate</TableHeader>
              <TableHeader>Elevation High</TableHeader>
            </tr>
          </thead>
          <tbody>
            {detailedActivity &&
              detailedActivity?.segment_efforts &&
              detailedActivity.segment_efforts.map((segment, i) => {
                return (
                  <tr key={`${segment.id}--${segment.elapsed_time}`}>
                    <TableData>{segment.name}</TableData>
                    <TableData>{segment.segment.distance}</TableData>
                    <TableData>{segment.segment.maximum_grade}</TableData>
                    <TableData>{segment.segment.average_grade}</TableData>
                    <TableData>{segment.elapsed_time}</TableData>
                    <TableData>{segment.average_heartrate}</TableData>
                    <TableData>{segment.segment.elevation_high}</TableData>
                  </tr>
                );
              })}
          </tbody>
        </Table>
        <StravaEmbed id={from?.id} />
      </Container>

      <StyledBackButton
        onClick={handleGoBack}
        style={{ textAlign: 'center', marginLeft: '49vw', paddingBottom: '1em' }}
      >
        Back
      </StyledBackButton>
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
  th {
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
  @media screen and (max-width: 650px) {
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(8, 1fr);
    font-size: 10px;
    grid-gap: 0.25em;
    padding: 0.25em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  @media screen and (max-width: 450px) {
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(8, 1fr);
    font-size: 8px;
    grid-gap: 0.15em;
    padding: 0.15em;
    text-align: left;
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
    @media screen and (max-width: 650px) {
      grid-template-columns: repeat(9, 1fr);
      grid-template-rows: repeat(8, 1fr);
      font-size: 10px;
      grid-gap: 0.25em;
      padding: 0.25em;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    @media screen and (max-width: 450px) {
      grid-template-columns: repeat(9, 1fr);
      grid-template-rows: repeat(8, 1fr);
      font-size: 8px;
      grid-gap: 0.15em;
      padding: 0.15em;
      text-align: left;
    }
  }
`;

const StyledBackButton = styled.button`
  display: relative;
  position: sticky;
  min-width: 80px;
  background-color: #fc5200;
  height: 50px;
  width: 8%;
  text-align: center;
  /* margin-top: -2em; */
  line-height: 48px;
  padding: 6px 12px;
  font-size: 18px;
  text-transform: uppercase;
  border: none;
  text-decoration: none;
  border-radius: 10px;
  text-align: center;
  color: #fff;
  font-weight: 600;
  &:hover,
  &:focus {
    text-decoration: none;
    filter: brightness(1.1);
  }
`;
const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const TableHeader = styled.th`
  background-color: #f2f2f2;
  font-weight: bold;
  padding: 8px;
  text-align: left;

  @media screen and (max-width: 768px) {
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(8, 1fr);
    font-size: 12px;
    grid-gap: 0.5em;
    padding: 0.5em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  @media screen and (max-width: 650px) {
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(8, 1fr);
    font-size: 10px;
    grid-gap: 0.25em;
    padding: 0.25em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  @media screen and (max-width: 450px) {
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(8, 1fr);
    font-size: 8px;
    grid-gap: 0.15em;
    padding: 0.15em;
    text-align: left;
  }
`;

const TableData = styled.td`
  border: 1px solid #ddd;
  padding: 8px;
  @media screen and (max-width: 768px) {
    font-size: 14px;
    margin-top: 0.5em;
    border-radius: 5px;
    padding: 0.5em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  @media screen and (max-width: 650px) {
    font-size: 10px;
    grid-gap: 0.25em;
    padding: 0.25em;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  @media screen and (max-width: 450px) {
    font-size: 8px;
    grid-gap: 0.15em;
    padding: 0.15em;
    text-align: left;
  }
`;

const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  display: flex;
  z-index: 1000;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  opacity: 0.7;
  color: ${(props) => props.theme.colour.strava};
  margin: 60px 0px 200px 90vw;
`;
