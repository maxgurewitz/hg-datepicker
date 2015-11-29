var helpers = require(__BASE + '/test/helpers');
var initializeState = require(__BASE + '/src/initialize-state');

describe('initializeState', function() {
  describe('with default values', function() {
    it('returns hello world', function() {
      helpers.expect(initializeState()()).to.eql({
        model: {
          open: false,
          isPopUpTop: false,
          isButtonInBottomHalf: false,
          displayedMonth: 0,
          displayedYear: 2015,
          translation: {
            format: 'd mmmm, yyyy',
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
          selectedDay: null,
          selectedMonth: null,
          selectedYear: null,
          highlightedDayIndex: null,
          years: {}
        }
      });
    });
  });
});
