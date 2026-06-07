/**
 * Removes stale cached data once it is older than the provided retention window.
 * Stored values without a `timestamp` field are currently left to existing
 * parsing/date behavior.
 *
 * @param {string} key - localStorage key to check.
 * @param {number} durationInDays - Maximum cache age in days.
 */
export const removeDataAfterDuration = (key, durationInDays) => {
  const storedData = localStorage.getItem(key);

  if (storedData) {
    const storedTimestamp = new Date(JSON.parse(storedData).timestamp);
    const currentTimestamp = new Date();
    const timeDifference = currentTimestamp - storedTimestamp;
    const timeDifferenceInDays = timeDifference / (1000 * 60 * 60 * 24);

    if (timeDifferenceInDays >= durationInDays) {
      localStorage.removeItem(key);
    }
  }
};
