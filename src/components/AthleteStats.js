import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import { isUnauthorizedError } from '../utils/helpers';
import styled from 'styled-components';
import { Run } from '@styled-icons/boxicons-regular/Run';
import { Bicycle } from '@styled-icons/bootstrap/Bicycle';

const METRES_PER_MILE = 1609.344;
const METRES_PER_KM = 1000;
const FEET_PER_METRE = 3.28084;
const EVEREST_HEIGHT_METRES = 8848.86;

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
  return toNumber(value).toLocaleString('en-GB', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

const metresToMiles = (metres) => {
  return toNumber(metres) / METRES_PER_MILE;
};

const metresToKm = (metres) => {
  return toNumber(metres) / METRES_PER_KM;
};

const metresToFeet = (metres) => {
  return toNumber(metres) * FEET_PER_METRE;
};

const metresToEverests = (metres) => {
  return toNumber(metres) / EVEREST_HEIGHT_METRES;
};

const AthleteStats = ({ athlete, onAuthError }) => {
  const token = JSON.parse(localStorage.getItem('access_token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!athlete?.id || !token) {
        return;
      }

      try {
        const athleteStats = await getAthleteStats(athlete.id, token);

        if (athleteStats) {
          setUser(athleteStats);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          onAuthError?.(error);
          return;
        }

        console.error(error.message);
      }
    }

    fetchData();
  }, [athlete?.id, onAuthError, token]);

  if (!athlete?.id || !user?.data) {
    return null;
  }

  const allRunTotals = user.data.all_run_totals || {};
  const allRideTotals = user.data.all_ride_totals || {};

  const runDistanceMetres = toNumber(allRunTotals.distance);
  const rideDistanceMetres = toNumber(allRideTotals.distance);

  const totalDistanceMetres = runDistanceMetres + rideDistanceMetres;

  const runElevationMetres = toNumber(allRunTotals.elevation_gain);
  const rideElevationMetres = toNumber(allRideTotals.elevation_gain);

  const totalElevationMetres = runElevationMetres + rideElevationMetres;

  const runMiles = metresToMiles(runDistanceMetres);
  const rideMiles = metresToMiles(rideDistanceMetres);
  const totalMiles = metresToMiles(totalDistanceMetres);

  const runKm = metresToKm(runDistanceMetres);
  const rideKm = metresToKm(rideDistanceMetres);
  const totalKm = metresToKm(totalDistanceMetres);

  const totalEverests = metresToEverests(totalElevationMetres);
  const totalElevationFeet = metresToFeet(totalElevationMetres);

  return (
    <StatsPanel>
      <ProfileCard>
        <AvatarImage src={athlete.profile_medium} alt="Athlete avatar" />

        <ProfileText>
          <AthleteName>
            {athlete.firstname} {athlete.lastname}
          </AthleteName>
          <ProfileMeta>Followers: {athlete.follower_count || 0}</ProfileMeta>
          <ProfileMeta>Clubs: {athlete.clubs?.length || 0}</ProfileMeta>
        </ProfileText>
      </ProfileCard>

      <StatsGrid>
        <MetricCard>
          <IconWrap>
            <RunIcon />
          </IconWrap>

          <MetricContent>
            <MetricLabel>All Time Runs</MetricLabel>
            <MetricValue>{formatNumber(allRunTotals.count, 0, 0)}</MetricValue>
            <MetricSubText>{formatNumber(runMiles)} miles</MetricSubText>
            <MetricSubText>{formatNumber(runKm)} km</MetricSubText>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <IconWrap>
            <BikeIcon />
          </IconWrap>

          <MetricContent>
            <MetricLabel>All Time Rides</MetricLabel>
            <MetricValue>{formatNumber(allRideTotals.count, 0, 0)}</MetricValue>
            <MetricSubText>{formatNumber(rideMiles)} miles</MetricSubText>
            <MetricSubText>{formatNumber(rideKm)} km</MetricSubText>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <IconWrap>
            <EmojiIcon>📍</EmojiIcon>
          </IconWrap>

          <MetricContent>
            <MetricLabel>Total Distance</MetricLabel>
            <MetricValue>{formatNumber(totalMiles)}</MetricValue>
            <MetricSubText>miles</MetricSubText>
            <MetricSubText>{formatNumber(totalKm)} km</MetricSubText>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <IconWrap>
            <EmojiIcon>⛰️</EmojiIcon>
          </IconWrap>

          <MetricContent>
            <MetricLabel>Mt Everests</MetricLabel>
            <MetricValue>{formatNumber(totalEverests)}</MetricValue>
            <MetricSubText>
              {formatNumber(totalElevationFeet, 0, 0)} ft climbed
            </MetricSubText>
            <MetricSubText>
              {formatNumber(totalElevationMetres, 0, 0)} m climbed
            </MetricSubText>
          </MetricContent>
        </MetricCard>
      </StatsGrid>
    </StatsPanel>
  );
};

export default AthleteStats;

const StatsPanel = styled.section`
  width: 100%;
  margin: 0 0 1rem 0;

  @media screen and (max-width: 560px) {
    margin-bottom: 0.75rem;
    margin-top: -4rem;
  }
`;

const ProfileCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  margin-top: -1rem;
  padding: 1rem;
  background: rgba(17, 24, 39, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;

  @media screen and (max-width: 560px) {
    display: none;
  }
`;

const AvatarImage = styled.img`
  width: 72px;
  height: 72px;
  min-width: 72px;
  border-radius: 50%;
  border: 3px solid #fc5200;
  object-fit: cover;

  @media screen and (max-width: 560px) {
    width: 52px;
    height: 52px;
    min-width: 52px;
  }
`;

const ProfileText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

const AthleteName = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: 800;

  @media screen and (max-width: 560px) {
    font-size: 1rem;
  }
`;

const ProfileMeta = styled.span`
  color: #cbd5e1;
  font-size: 0.9rem;

  @media screen and (max-width: 560px) {
    font-size: 0.75rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 1rem;

  @media screen and (max-width: 1250px) {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
    gap: 0.85rem;
  }

  @media screen and (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  @media screen and (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.article`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 112px;
  padding: 1rem;
  background: #f8fafc;
  color: #111827;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);

  @media screen and (max-width: 560px) {
    min-height: 82px;
    padding: 0.65rem;
    gap: 0.55rem;
    border-radius: 12px;
    align-items: flex-start;
    min-height: 76px;
    margin-top: 0rem;
  }

  @media screen and (max-width: 360px) {
    min-height: 76px;
  }
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(252, 82, 0, 0.1);

  @media screen and (max-width: 560px) {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 10px;
  }
`;

const MetricContent = styled.div`
  min-width: 0;
`;

const MetricLabel = styled.p`
  margin: 0 0 0.35rem;
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 700;

  @media screen and (max-width: 560px) {
    font-size: 0.72rem;
    margin-bottom: 0.25rem;
  }
`;

const MetricValue = styled.p`
  margin: 0;
  color: #111827;
  font-size: clamp(1rem, 4.5vw, 1.7rem);
  font-weight: 900;
  line-height: 1.05;
  word-break: break-word;
`;

const MetricSubText = styled.p`
  margin: 0.35rem 0 0;
  color: #6b7280;
  font-size: 0.82rem;

  @media screen and (max-width: 560px) {
    margin-top: 0.2rem;
    font-size: 0.68rem;
    line-height: 1.2;
  }
`;

const RunIcon = styled(Run)`
  width: 1.6rem;
  height: 1.6rem;
  color: #fc5200;

  @media screen and (max-width: 560px) {
    width: 1.2rem;
    height: 1.2rem;
  }
`;

const BikeIcon = styled(Bicycle)`
  width: 1.6rem;
  height: 1.6rem;
  color: #fc5200;

  @media screen and (max-width: 560px) {
    width: 1.2rem;
    height: 1.2rem;
  }
`;

const EmojiIcon = styled.span`
  font-size: 1.45rem;
  line-height: 1;

  @media screen and (max-width: 560px) {
    font-size: 1.1rem;
  }
`;
