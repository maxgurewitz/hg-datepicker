var hg = require('mercury');
var translations = require('./translations');
var dateFormat = require('dateformat');
var xtend = require('xtend');
var channels = require('./channels');

module.exports = function initializeState(opts) {
  var args = opts || {};
  var translation = xtend(translations['en-US'], translations[args.locale] || {});
  var selectedDate = args.selectedDate || new Date();

  dateFormat.i18n = {
    dayNames: translation.weekdaysShort.concat(translation.weekdaysFull),
    monthNames: translation.monthsShort.concat(translation.monthsFull)
  };

  return hg.state({
    channels: channels,
    model: hg.struct({
      displayedMonth: hg.value(selectedDate.getMonth()),
      displayedYear: hg.value(selectedDate.getFullYear()),
      highlightedDayIndex: hg.value(null),
      // FIXME: initialize from element if it exists
      isButtonInBottomHalf: hg.value(false),
      isPopUpTop: hg.value(false),
      isOpen: hg.value(false),
      selectedDay: hg.value(selectedDate.getDate()),
      selectedMonth: hg.value(selectedDate.getMonth()),
      selectedYear: hg.value(selectedDate.getFullYear()),
      translation: translation,
      years: {}
    })
  });
};
