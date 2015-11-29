var hg = require('mercury');
var render = require('./renderers/date-picker');

function DatePicker() {
  return 'hello world';
};

DatePicker.render = render;

module.exports = DatePicker;
