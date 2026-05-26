import { useEffect, useState } from 'react';

// custom hook for getting the window width
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

export const useScroll = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return { isVisible, scrollToTop };
};

export const useLocalStorageState = ({ key, state, setState, stateKey }) => {
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const valueToStore = state[stateKey];
  console.log({ key, state, setState, stateKey });
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);

      if (item !== null && item !== undefined) {
        setState((prevState) => ({
          ...prevState,
          [stateKey]: JSON.parse(item),
        }));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    } finally {
      setHasLoadedFromStorage(true);
    }
  }, [key, setState, stateKey]);

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return;
    }
    if (Array.isArray(valueToStore) && valueToStore.length === 0) {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving "${key}" to localStorage`, error);
    }
  }, [key, valueToStore, hasLoadedFromStorage]);
  return { hasLoadedFromStorage };
};
