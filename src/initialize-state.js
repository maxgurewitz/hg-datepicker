var hg = require('mercury');
var translations = require('./translations');
var dateFormat = require('dateformat');
var xtend = require('xtend');
var channels = require('./channels');
var generateMonth = require('./generate-month');

module.exports = function initializeState(opts) {
  var args = opts || {};
  var translation = xtend(translations['en-US'], translations[args.locale] || {});
  var currentDate = args.currentDate || new Date();
  var selectedDate = args.selectedDate || currentDate;

  var selectedDay = selectedDate.getDate();
  var selectedMonth = selectedDate.getMonth();
  var selectedYear = selectedDate.getFullYear();

  var currentDay = currentDate.getDate();
  var currentMonth = currentDate.getMonth();
  var currentYear = currentDate.getFullYear();

  dateFormat.i18n = {
    dayNames: translation.weekdaysShort.concat(translation.weekdaysFull),
    monthNames: translation.monthsShort.concat(translation.monthsFull)
  };

  var years = {};
  var month = generateMonth({
    currentDay: currentDay,
    currentMonth: currentMonth,
    currentYear: currentYear,
    firstDay: translation.firstDay,
    month: selectedMonth,
    year: selectedYear
  });

  years[selectedYear] = {};
  years[selectedYear][selectedMonth] = month;

  return hg.state({
    channels: channels,
    model: hg.struct({
      currentDay: hg.value(currentDay),
      currentMonth: hg.value(currentMonth),
      currentYear: hg.value(currentYear),
      displayedMonth: hg.value(selectedMonth),
      displayedYear: hg.value(selectedYear),
      highlightedDayIndex: hg.value(null),
      // FIXME: initialize from element if it exists
      isButtonInBottomHalf: hg.value(false),
      isPopUpTop: hg.value(false),
      isOpen: hg.value(false),
      selectedDay: hg.value(selectedDay),
      selectedMonth: hg.value(selectedMonth),
      selectedYear: hg.value(selectedYear),
      translation: translation,
      years: years
    })
  });
};
