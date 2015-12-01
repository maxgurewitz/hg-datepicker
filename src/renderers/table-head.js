var h = require('mercury').h;
var modulo = require('../modulo');

var styles = {
  row: {
    height: '2em'
  }
};

module.exports = function tableHead(state) {
  var firstDay = state.model.translation.firstDay;

  var dayThs = [];

  for (var i = firstDay; i < firstDay + 7; i++) {
    var weekday = state.model.translation.weekdaysShort[modulo(i, 7)];
    var th = h('th', weekday);
    dayThs.push(th);
  }

  return h('thead', h('tr', { style: styles.row }, dayThs));
};
