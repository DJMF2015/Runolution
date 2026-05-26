import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSecondstoMinutes, getKmsToMiles, getMstoKmHr } from '../utils/conversion';
import { getDetailedAthleteData } from '../utils/functions';
import { useScroll } from '../utils/hooks';
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
    <PageContainer>
      {isVisible && <ScrollToTop alt="Go to top" onClick={scrollToTop} />}

      <HeaderCard>
        <HeaderContent>
          <ActivityTitle>{from?.name}</ActivityTitle>
          <BackButton onClick={handleGoBack}>Back</BackButton>
        </HeaderContent>
      </HeaderCard>

      <ChartsGrid>
        <ChartCard>
          <ChartHeading>Best Efforts</ChartHeading>
          <PaceZoneBarChart props={detailedActivity} />
        </ChartCard>

        <ChartCard>
          <ChartHeading>Elevation & Effort</ChartHeading>
          <ElevationChart props={detailedActivity} />
        </ChartCard>
      </ChartsGrid>

      <ResponsiveSection>
        <SectionTitle>Splits</SectionTitle>

        <ResponsiveTable>
          <thead>
            <tr>
              <th>Split</th>
              <th>Distance</th>
              <th>Elevation</th>
              <th>Elapsed</th>
              <th>Speed</th>
              <th>Cadence</th>
              <th>Avg HR</th>
              <th>Max HR</th>
              <th>Pace Zone</th>
            </tr>
          </thead>

          <tbody>
            {detailedActivity?.laps?.map((lap) => (
              <tr key={`${lap.id || lap.split}-${lap.elapsed_time}`}>
                <td data-label="Split">{from.name}</td>
                <td data-label="Distance">{getKmsToMiles(lap.distance)}</td>
                <td data-label="Elevation">{lap.total_elevation_gain}</td>
                <td data-label="Elapsed">{getSecondstoMinutes(lap.elapsed_time)}</td>
                <td data-label="Speed">{getMstoKmHr(lap?.average_speed)}</td>
                <td data-label="Cadence">{lap.average_cadence || '—'}</td>
                <td data-label="Avg HR">{lap.average_heartrate || '—'}</td>
                <td data-label="Max HR">{lap.max_heartrate || '—'}</td>
                <td data-label="Pace Zone">{lap.pace_zone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      </ResponsiveSection>

      <ResponsiveSection>
        <SectionTitle>Segment Efforts</SectionTitle>

        <ResponsiveTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Distance</th>
              <th>Max Grade</th>
              <th>Average Grade</th>
              <th>Elapsed</th>
              <th>Avg HR</th>
              <th>Elevation High</th>
            </tr>
          </thead>

          <tbody>
            {detailedActivity?.segment_efforts?.map((segment) => (
              <tr key={`${segment.id}-${segment.elapsed_time}`}>
                <td data-label="Name">{segment.name}</td>
                <td data-label="Distance">{segment.segment.distance}</td>
                <td data-label="Max Grade">{segment.segment.maximum_grade}</td>
                <td data-label="Average Grade">{segment.segment.average_grade}</td>
                <td data-label="Elapsed">{getSecondstoMinutes(segment.elapsed_time)}</td>
                <td data-label="Avg HR">{segment.average_heartrate || '—'}</td>
                <td data-label="Elevation High">{segment.segment.elevation_high}</td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      </ResponsiveSection>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  min-height: 100vh;
  margin-top: 0;
  padding: 1.5rem;
  padding-top: 5.25rem;
  background:
    radial-gradient(circle at top left, rgba(252, 82, 0, 0.12), transparent 32%),
    linear-gradient(180deg, #0f1720 0%, #111820 45%, #171f29 100%);
  color: #fff;

  @media screen and (max-width: 700px) {
    padding: 1rem;
    padding-top: 4.35rem;
  }
`;

const HeaderCard = styled.div`
  background: #171f29;
  border: 1px solid #26313d;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-width: 0;

  @media screen and (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ActivityTitle = styled.h1`
  margin: 0;
  color: #fff;
  font-size: clamp(1.2rem, 3vw, 2rem);
  min-width: 0;
  overflow-wrap: anywhere;
`;

const BackButton = styled.button`
  flex: 0 0 auto;
  background: #fc5200;
  color: #fff;
  border: solid;
  border-radius: 999px;
  border-color: ghostwhite;
  padding: 0.75rem 2.5rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    filter: brightness(1.25);
  }

  @media screen and (max-width: 600px) {
    border-radius: 999px;
    padding: 0.5rem 1.75rem;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
  min-width: 0;

  @media screen and (max-width: 950px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.section`
  background: #ffffff;
  border: 1px solid #26313d;
  border-radius: 16px;
  padding: 1rem;
  min-height: 360px;
  min-width: 0;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);

  @media screen and (max-width: 700px) {
    min-height: 300px;
    padding: 0.75rem;
    border-radius: 12px;
  }

  @media screen and (max-width: 420px) {
    min-height: 280px;
    padding: 0.6rem;
  }
`;

const ChartHeading = styled.h2`
  margin: 0 0 1rem;
  color: #111;
  font-size: 1rem;
`;

const ResponsiveSection = styled.section`
  background: #171f29;
  border: 1px solid #26313d;
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  overflow-x: auto;
`;

const SectionTitle = styled.h2`
  color: #fff;
  margin: 0 0 1rem;
  font-size: 1.1rem;
`;

const ResponsiveTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: #d7dde6;

  thead {
    background: #111820;
  }

  th,
  td {
    padding: 0.85rem;
    border-bottom: 1px solid #26313d;
    text-align: left;
  }

  th {
    color: #fff;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  tbody tr:hover {
    background: #1f2a36;
  }

  @media screen and (max-width: 768px) {
    border-collapse: separate;
    border-spacing: 0 0.75rem;

    thead {
      display: none;
    }

    tr {
      display: block;
      background: #111820;
      border: 1px solid #26313d;
      border-radius: 14px;
      padding: 0.75rem;
    }

    td {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid #26313d;
      padding: 0.65rem 0;
      font-size: 0.9rem;
    }

    td:last-child {
      border-bottom: none;
    }

    td::before {
      content: attr(data-label);
      color: #9aa4b2;
      font-weight: 700;
    }
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
