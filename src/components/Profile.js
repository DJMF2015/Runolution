import React from 'react';
import styled from 'styled-components';

export const AthleteProfile = ({ athlete }) => (
  <>
    <AvatarProfile className="athletename">{`${athlete.firstname} ${athlete.lastname}`}</AvatarProfile>
    <AvatarProfile className="followers">
      <b>Followers: </b> {athlete.follower_count}
    </AvatarProfile>
    {athlete.clubs?.length > 0 && (
      <AvatarProfile className="clubs">Clubs: {athlete.clubs.length}</AvatarProfile>
    )}
  </>
);

const AvatarProfile = styled.h4`
  margin-top: 9rem;
  width: 7vw;
  border-radius: 50%;
  height: 7vw;
  display: flex;
  position: absolute;
  right: 5rem;

  @media screen and (max-width: 1048px) {
    display: none;
  }

  &.athletename {
    margin-top: 9rem;
    margin-left: 1rem;
    font-size: 0.9rem;
    display: flex;
    position: absolute;
    right: 5rem;

    @media screen and (max-width: 1200px) {
      font-size: 0.7rem;
      margin-top: 7rem;
    }
    @media screen and (max-width: 1048px) {
      display: none;
    }
  }

  &.followers {
    margin-top: 11rem;
    margin-left: 1rem;
    font-size: 0.9rem;
    display: flex;
    position: absolute;
    right: 5rem;

    @media screen and (max-width: 1200px) {
      font-size: 0.7rem;
      margin-top: 9rem;
    }
    @media screen and (max-width: 1048px) {
      display: none;
    }
  }

  &.clubs {
    margin-top: 13rem;
    margin-left: 1rem;
    font-size: 0.9rem;
    display: flex;
    position: absolute;
    right: 5rem;

    @media screen and (max-width: 1200px) {
      font-size: 0.7rem;
      margin-top: 8rem;
    }

    @media screen and (max-width: 1048px) {
      display: none;
    }
  }
`;
