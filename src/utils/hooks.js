import React from 'react';
import useSWR from 'swr';
import fetcher from './fetcher';
import useAuthorizaton from './useAuth';
const useClub = () => {
  const { code } = useAuthorizaton(
    `https://www.strava.com/api/v3/clubs/${process.env.REACT_APP_CLUB_ID}?access_token=`
  );
  const { data: props, errors } = useSWR(code, fetcher);

  if (errors) return <h1>Something went wrong!</h1>;
  if (!props) return <h1>Loading...</h1>;

  return { props, errors };
};

// receives pb for HM of specific segment and event (BB HM)
const useGetPB = () => {
  const { code } = useAuthorizaton(
    `https://www.strava.com/api/v3/activities/381066837&segment_efforts?segment_id=381066837&access_token=`
  );
  const { data: dataItem, errors } = useSWR(code, fetcher);

  if (errors) return <h1>Something went wrong!</h1>;
  if (!dataItem) return <h1>Loading...</h1>;
  return { dataItem, errors };
};
export { useClub, useGetPB };
