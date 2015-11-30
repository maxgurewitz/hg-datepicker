var helpers = require(__BASE + '/test/helpers');
var initializeState = require(__BASE + '/src/initialize-state');

describe('initializeState', function() {
  describe('with optional arguments', function() {
    it('contains the expected values', function() {
      var state = initializeState({
        selectedDate: new Date('Sun Nov 29 2015')
      })();

      helpers.expect(state).to.eql({
        channels: {
          toggle: {
            type: 'dom-delegator-handle'
          }
        },
        model: {
          isOpen: false,
          isPopUpTop: false,
          isButtonInBottomHalf: false,
          displayedMonth: 10,
          displayedYear: 2015,
          translation: {
            firstDay: 0,
            format: 'mmm d, yyyy',
            monthsFull: [
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December'
            ],
            monthsShort: [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec'
            ],
            weekdaysFull: [
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday'
            ],
            weekdaysShort: [
              'Sun',
              'Mon',
              'Tue',
              'Wed',
              'Thu',
              'Fri',
              'Sat'
            ]
          },
          selectedDay: 29,
          selectedMonth: 10,
          selectedYear: 2015,
          highlightedDayIndex: null,
          years: {}
        }
      });
    });
  });
});
