var hg = require('mercury');
var dateFormat = require('dateformat');

var h = hg.h;

var styles = {
  popUpHeader: {
    textAlign: 'center',
    position: 'relative'
  },
  lastMonth: {
    width: '30px',
    height: '30px',
    float: 'left',
    backgroundColor: 'black'
  },
  nextMonth: {
    height: '30px',
    width: '30px',
    float: 'right',
    backgroundColor: 'black'
  }
};

module.exports = function header(state) {
  var displayedDate = new Date(
    state.model.displayedYear,
    state.model.displayedMonth
  );

  var title = dateFormat(displayedDate, 'mmmm yyyy');

  return h('div', {
    style: styles.popUpHeader
  }, [
    title,
    h('div', {
      style: styles.lastMonth,
      'ev-click': hg.send(state.channels.lastMonth)
    }),
    h('div', {
      style: styles.nextMonth,
      'ev-click': hg.send(state.channels.nextMonth)
    })
  ]);
};
