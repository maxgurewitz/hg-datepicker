var hg = require('mercury');
var chunk = require('lodash.chunk');
var xtend = require('xtend');

var h = hg.h;

var styles = {
  dayTd: {
    lineHeight: 1.95
  },
  dayTdContent: {
    margin: '0 auto',
    height: '2em',
    width: '2em',
    borderRadius: '100%'
  }
};

var colors = {
  primary: '#DA3743',
  faded: '#f7d7d9'
};

function dayToTdFactory(state) {
  return function dayToTd(day, i) {
    var contentStyle = state.model.highlightedDayIndex === i ?
      xtend(styles.dayTdContent, {
        backgroundColor: colors.faded,
        color: colors.primary
      }) :
      styles.dayTdContent;

    var tdContent = h('div', { style: contentStyle }, String(day.dayOfMonth));

    return h('td', {
      style: styles.dayTd,
      onmouseout: hg.send(state.channels.mouseoutDay, i),
      onmouseover: hg.send(state.channels.mouseoverDay, i)
    }, tdContent);
  };
}

module.exports = function tableBody(state) {
  var month = state
    .model
    .years[state.model.displayedYear][state.model.displayedMonth];

  var weeks = chunk(month.displayedDays, 7);
  var dayToTd = dayToTdFactory(state);
  return weeks.map(function(week) {
    return h('tr', week.map(dayToTd));
  });
};
