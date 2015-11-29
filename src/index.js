var render = require('./renderers/date-picker');
var mount = require('./mount');
var initializeState = require('./initialize-state');

var DatePicker = initializeState;
DatePicker.render = render;
DatePicker.mount = mount;

module.exports = DatePicker;
