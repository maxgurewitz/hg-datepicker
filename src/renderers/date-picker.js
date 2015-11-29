var h = require('mercury').h;
var dateFormat = require('dateformat');

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
    h('a', dateFormat(selectedDate, state.model.translation.format)),
    h('div', 'popup')
  ]);
};
