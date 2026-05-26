const METRES_PER_KM = 1000;
const METRES_PER_MILE = 1609.344;
const FEET_PER_METRE = 3.28084;
const EVEREST_HEIGHT_METRES = 8848.86;

const formatNumber = (value, options = {}) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0.00';
  }

  return number.toLocaleString('en-GB', {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
};

const getUnitsWithCommas = (data) => {
  const number = Number(data);

  if (!Number.isFinite(number)) {
    return '0';
  }

  return number.toLocaleString('en-GB');
};

const getKmsToMiles = (metres) => {
  const miles = Number(metres || 0) / METRES_PER_MILE;
  return `${formatNumber(miles)} miles`;
};

const getMilesToKms = (metres) => {
  const kms = Number(metres || 0) / METRES_PER_KM;
  return `${formatNumber(kms)} km`;
};

const getMetresToMiles = (metres) => {
  const miles = Number(metres || 0) / METRES_PER_MILE;
  return `${formatNumber(miles)} miles`;
};

const getMetresToKm = (metres) => {
  const kms = Number(metres || 0) / METRES_PER_KM;
  return `${formatNumber(kms)} km`;
};

const getMetresToFeet = (metres) => {
  const feet = Number(metres || 0) * FEET_PER_METRE;
  return `${formatNumber(feet, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ft`;
};

const getSecondstoMinutes = (seconds) => {
  const totalSeconds = Number(seconds || 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} mins`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} hr ${minutes} mins`;
};

const getMstoKmHr = (metresPerSecond) => {
  const kmHr = (Number(metresPerSecond || 0) * 60 * 60) / 1000;
  return `${formatNumber(kmHr)} km/hr`;
};

const getSufferScore = (score) => {
  switch (true) {
    case score >= 150:
      return `${score} Tough - watch out for overtraining.`;
    case score > 50 && score < 150:
      return `${score} Good job managing your effort`;
    case score >= 1 && score <= 50:
      return `${score} Easy - good for recovery`;
    default:
      return 'No score';
  }
};

const getNoOfMtEverests = (metres) => {
  const everests = Number(metres || 0) / EVEREST_HEIGHT_METRES;

  return formatNumber(everests, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getCurrentYear = () => {
  const currentYear = new Date();
  return currentYear.getUTCFullYear();
};

const formattedDate = (date) => {
  if (!date) return '';
  return date.split('T')[0];
};

const getCurrentDate = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  const date = new Date(currentYear, currentMonth, currentDay);

  return { date, currentDate, currentYear, currentMonth, currentDay };
};

export {
  getKmsToMiles,
  getMilesToKms,
  getMetresToMiles,
  getMetresToKm,
  formatNumber,
  getMetresToFeet,
  getMstoKmHr,
  getSufferScore,
  getSecondstoMinutes,
  formattedDate,
  getCurrentDate,
  getNoOfMtEverests,
  getUnitsWithCommas,
  getCurrentYear,
};
