var hg = require('mercury');
var translations = require('./translations');
var dateFormat = require('dateformat');
var xtend = require('xtend');

module.exports = function initializeState(opts) {
  var args = opts || {};
  var translation = xtend(translations['en-US'], translations[args.locale] || {});
  var selectedDate = args.selectedDate || new Date();

  dateFormat.i18n = {
    dayNames: translation.weekdaysShort.concat(translation.weekdaysFull),
    monthNames: translation.monthsShort.concat(translation.monthsFull)
  };

  return hg.state({
    model: hg.struct({
      open: hg.value(false),
      // FIXME: initialize from element if it exists
      isPopUpTop: hg.value(false),
      isButtonInBottomHalf: hg.value(false),
      // FIXME: initialize from current date
      displayedMonth: hg.value(selectedDate.getMonth()),
      displayedYear: hg.value(selectedDate.getFullYear()),
      translation: translation,
      selectedDay: hg.value(selectedDate.getDate()),
      selectedMonth: hg.value(selectedDate.getMonth()),
      selectedYear: hg.value(selectedDate.getFullYear()),
      highlightedDayIndex: hg.value(null),
      years: {}
    })
  });
};
