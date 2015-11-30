module.exports = function getFirstDayOfMonth(month, year) {
  return new Date(year + '-' + (month + 1) + '-01').getDay();
};
