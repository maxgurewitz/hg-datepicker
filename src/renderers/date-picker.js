var h = require('mercury').h;

module.exports = function datePicker(state) {
  return h('div', String(state.count));
};
