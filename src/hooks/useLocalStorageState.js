import { useEffect, useState } from 'react';

/**
 * Keeps a single field in a component state object synchronized with
 * localStorage.
 *
 * The hook reads once on mount, reports when hydration is complete, and writes
 * future non-empty values back to localStorage.
 */
export const useLocalStorageState = ({ key, state, setState, stateKey }) => {
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const valueToStore = state[stateKey];

  // Hydrate the requested state field before the caller decides whether it
  // needs to fetch fresh data.
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

  // Avoid overwriting a populated cache with an initial empty array before
  // hydration has completed.
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
