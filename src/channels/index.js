var iterateMonth = require('./iterate-month');
var getDate = require('../get-date');

module.exports = {
  lastMonth: iterateMonth(getDate.last),
  nextMonth: iterateMonth(getDate.next),
  toggle: require('./toggle')
};
