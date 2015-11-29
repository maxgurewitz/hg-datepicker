var hg = require('mercury');
var dateFormat = require('dateformat');
var popUp = require('./pop-up');

var h = hg.h;

var styles = {
  datePicker: {
    textAlign: 'center'
  }
};

module.exports = function datePicker(state) {
  var selectedDate = new Date(
    state.model.selectedYear,
    state.model.selectedMonth,
    state.model.selectedDay
  );

  return h('div', {
    style: styles.datePicker
  }, [
    h('a', {
      'ev-click': hg.send(state.channels.toggle)
    },
    dateFormat(selectedDate, state.model.translation.format)),
    popUp(state)
  ]);
};
