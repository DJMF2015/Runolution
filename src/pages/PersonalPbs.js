import React from 'react';
import ActivityList from '../components/ActivityList';
import { useGetPB } from '../utils/hooks';
const PersonalPbs = () => {
  const { dataItem: data, error } = useGetPB();

  if (error) return <h1>Something went wrong!</h1>;
  if (!data) return <h1>Loading...</h1>;
  return (
    <>
      {data.best_efforts.map((act, i) => {
        const pbElapsedTime = (act.elapsed_time / 60).toFixed(2);
        const pbDistance = (act.distance / 1000).toFixed(2);
        return (
          <>
            <ActivityList key={i} pbElapsedTime={pbElapsedTime} pbDistance={pbDistance} />
          </>
        );
      })}
    </>
  );
};
export default PersonalPbs;
