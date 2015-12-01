var helpers = require(__BASE + '/test/helpers');
var initializeState = require(__BASE + '/src/initialize-state');

describe('initializeState', function() {
  describe('with optional arguments', function() {
    it('contains the expected values', function() {
      var state = initializeState({
        currentDate: new Date('Sun Nov 29 2015')
      })();

      helpers.expect(state).to.eql({
        channels: {
          lastMonth: { type: 'dom-delegator-handle' },
          nextMonth: { type: 'dom-delegator-handle' },
          toggle: { type: 'dom-delegator-handle' }
        },
        model: {
          currentDay: 29,
          currentMonth: 10,
          currentYear: 2015,
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
          years: {
            2015: {
              10: {
                displayedDays: [
                  { dayOfMonth: 1, isDisabled: true },
                  { dayOfMonth: 2, isDisabled: true },
                  { dayOfMonth: 3, isDisabled: true },
                  { dayOfMonth: 4, isDisabled: true },
                  { dayOfMonth: 5, isDisabled: true },
                  { dayOfMonth: 6, isDisabled: true },
                  { dayOfMonth: 7, isDisabled: true },
                  { dayOfMonth: 8, isDisabled: true },
                  { dayOfMonth: 9, isDisabled: true },
                  { dayOfMonth: 10, isDisabled: true },
                  { dayOfMonth: 11, isDisabled: true },
                  { dayOfMonth: 12, isDisabled: true },
                  { dayOfMonth: 13, isDisabled: true },
                  { dayOfMonth: 14, isDisabled: true },
                  { dayOfMonth: 15, isDisabled: true },
                  { dayOfMonth: 16, isDisabled: true },
                  { dayOfMonth: 17, isDisabled: true },
                  { dayOfMonth: 18, isDisabled: true },
                  { dayOfMonth: 19, isDisabled: true },
                  { dayOfMonth: 20, isDisabled: true },
                  { dayOfMonth: 21, isDisabled: true },
                  { dayOfMonth: 22, isDisabled: true },
                  { dayOfMonth: 23, isDisabled: true },
                  { dayOfMonth: 24, isDisabled: true },
                  { dayOfMonth: 25, isDisabled: true },
                  { dayOfMonth: 26, isDisabled: true },
                  { dayOfMonth: 27, isDisabled: true },
                  { dayOfMonth: 28, isDisabled: true },
                  { dayOfMonth: 29, isDisabled: true },
                  { dayOfMonth: 30, isDisabled: false },
                  { dayOfMonth: 1, isDisabled: true },
                  { dayOfMonth: 2, isDisabled: true },
                  { dayOfMonth: 3, isDisabled: true },
                  { dayOfMonth: 4, isDisabled: true },
                  { dayOfMonth: 5, isDisabled: true },
                  { dayOfMonth: 6, isDisabled: true },
                  { dayOfMonth: 7, isDisabled: true },
                  { dayOfMonth: 8, isDisabled: true },
                  { dayOfMonth: 9, isDisabled: true },
                  { dayOfMonth: 10, isDisabled: true },
                  { dayOfMonth: 11, isDisabled: true },
                  { dayOfMonth: 12, isDisabled: true }
                ]
              }
            }
          }
        }
      });
    });
  });
});
