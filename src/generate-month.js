var times = require('lodash.times');
var monthDays = require('month-days');
var getLastDate = require('./get-last-date');
var getFirstDayOfMonth = require('./get-first-day-of-month');
var modulo = require('./modulo');
var settings = require('./settings');

module.exports = function generateMonth(args) {
  var lastDate = getLastDate(args.month, args.year);

  var numberOfDays = monthDays(args.month, args.year);
  var numberOfDaysLastMonth = monthDays(lastDate.month, lastDate.year);

  var firstDayOfMonth = getFirstDayOfMonth(args.month, args.year);

  // README: due to weird format of translation.firstDay.
  var firstDay = modulo(args.firstDay - 1, 7);
  var numberOfDaysShownFromLastMonth = modulo(7 + firstDayOfMonth - firstDay, 7);

  var numberOfDaysShownFromNextMonth = settings.numberOfDaysInCalendar -
    (numberOfDaysShownFromLastMonth + numberOfDays);

  var daysLastMonth = times(numberOfDaysShownFromLastMonth, function buildLastMonthDays(dayIndex) {
    return {
      dayOfMonth: numberOfDaysLastMonth - numberOfDaysShownFromLastMonth + dayIndex + 1,
      isDisabled: true
    };
  });

  var daysThisMonth = times(numberOfDays, function buildDays(dayIndex) {
    return {
      dayOfMonth: dayIndex + 1,
      isDisabled: dayIndex < args.currentDay
    };
  });

  var daysNextMonth = times(numberOfDaysShownFromNextMonth, function buildNextMonthDays(dayIndex) {
    return {
      dayOfMonth: dayIndex + 1,
      isDisabled: true
    };
  });

  return {
    displayedDays: daysLastMonth.concat(daysThisMonth).concat(daysNextMonth)
  };
};
