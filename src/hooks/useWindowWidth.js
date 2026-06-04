import { useEffect, useState } from 'react';

/**
 * Tracks the current browser viewport width for responsive component logic.
 */
export const useGetWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { windowWidth };
};
