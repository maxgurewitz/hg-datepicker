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
          translations: {},
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
