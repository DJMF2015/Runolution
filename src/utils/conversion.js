const getKmsToMiles = (distance) => {
  const miles = distance / 1610;
  return Math.round(miles) + ` miles`;
};

const getMilesToKms = (distance) => {
  const kms = distance / 1000;
  return Math.round(kms) + ` kms`;
};

const getMetresToFeet = (data) => {
  const mtrsToFt = data * 3.28084;
  return getUnitsWithCommas(Math.round(mtrsToFt) + ' ft');
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

export {
  getKmsToMiles,
  getMilesToKms,
  getMetresToFeet,
  getSufferScore,
  getNoOfMtEverests,
  getUnitsWithCommas,
  getCurrentYear,
};
