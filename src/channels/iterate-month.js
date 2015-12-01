var hg = require('mercury');
var generateMonth = require('../generate-month');

module.exports = function iterateMonthFactory(iterator) {
  return function iterateMonth(state) {
    var date = iterator(state.model.displayedMonth(), state.model.displayedYear());
    var year = state.model.years[date.year] || {};

    state.model.displayedMonth.set(date.month);
    state.model.displayedYear.set(date.year);

    var month = generateMonth({
      currentMonth: state.model.currentMonth(),
      currentYear: state.model.currentYear(),
      currentDay: state.model.currentDay(),
      month: date.month,
      year: date.year,
      firstDay: state.model.translation.firstDay
    });

    state.model.years[date.year] = year;
    state.model.years[date.year][date.month] = month;
  };
};
