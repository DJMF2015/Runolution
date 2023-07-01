import { type } from '@testing-library/user-event/dist/type';

const getKmsToMiles = (distance) => {
  const miles = distance / 1610;
  return miles.toFixed(2) + ` miles`;
};

const getMilesToKms = (distance) => {
  const kms = distance / 1000;
  return kms.toFixed(2) + ` kms`;
};

const getMetresToFeet = (data) => {
  const mtrsToFt = data * 3.28084;
  return getUnitsWithCommas(mtrsToFt.toFixed(2) + ' ft');
};

const getSecondstoMinutes = (seconds) => {
  const time = seconds / 60;
  return Math.round(time.toFixed(2)) + ` mins`;
};

// convert to kms/per hour as strava api only gives back speed & velocity in units of mtrs/sec
const getMstoKmHr = (mtrs) => {
  const kmHr = (mtrs * 60 * 60) / 1000;
  return kmHr.toFixed(2) + ` km/hr`;
};

const getSufferScore = (score) => {
  switch (true) {
    case score >= 150:
      return `${score}  Tough - watch out for overtraining.`;
    case score > 50 && score < 150:
      return `${score}  Good job managing your effort`;
    case score >= 1 && score <= 50:
      return `${score}  Easy - good for recovery`;
    default:
      console.log('no score');
  }
};

const getNoOfMtEverests = (data) => {
  const EVERST_HGHT = 8849;
  const everests = data / EVERST_HGHT;
  return everests.toFixed(2);
};

const getUnitsWithCommas = (data) => {
  return data.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const getCurrentYear = () => {
  const currentYear = new Date();
  return currentYear.getUTCFullYear();
};

const formattedDate = (date) => {
  const formatted = date.split('T')[0];
  return formatted;
};
export {
  getKmsToMiles,
  getMilesToKms,
  getMetresToFeet,
  getMstoKmHr,
  getSufferScore,
  getSecondstoMinutes,
  formattedDate,
  getNoOfMtEverests,
  getUnitsWithCommas,
  getCurrentYear,
};
