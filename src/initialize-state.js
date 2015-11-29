var hg = require('mercury');

module.exports = function initializeState(opts) {
  return hg.state({
    model: hg.struct({
      open: hg.value(false),
      // FIXME: initialize from element if it exists
      isPopUpTop: hg.value(false),
      isButtonInBottomHalf: hg.value(false),
      // FIXME: initialize from current date
      displayedMonth: hg.value(0),
      displayedYear: hg.value(2015),
      // FIXME: set translations based on requested locale
      translations: {},
      selectedDay: hg.value(null),
      selectedMonth: hg.value(null),
      selectedYear: hg.value(null),
      highlightedDayIndex: hg.value(null),
      years: hg.struct({})
    })
  });
};
