import React, { Suspense } from 'react';
import fetcher from './fetcher';
import useSWRInfinite from 'swr/infinite';
import useAuthorizaton from './useAuth';

const useInfiniteScroll = () => {
  // code passes in the temporary access token
  const { code } = useAuthorizaton('');
  const PAGE_SIZE = 200;
  const {
    data: result,
    error,
    size,
    mutate,
    setSize,
    isValidating,
  } = useSWRInfinite(
    (index) =>
      `https://www.strava.com/api/v3/athlete/activities?include_all_efforts=true&per_page=${PAGE_SIZE}&page=${
        index + 1
      }&access_token=${code}`,
    fetcher,
    { suspense: false }
  );

  const results = result ? [].concat(...result) : [];
  const isLoadingInitialData = !result && !error;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && result && typeof result[size - 1] === 'undefined');
  const isEmpty = result?.[0]?.length === 0;
  const isReachingEnd =
    isEmpty || (result && result[result.length - 1]?.length < PAGE_SIZE);
  const isRefreshing = isValidating && result && result.length === size;

  return {
    results,
    mutate,
    size,
    setSize,
    isLoadingMore,
    isRefreshing,
    error,
    isReachingEnd,
  };
};
export default useInfiniteScroll;
