var h = require('mercury').h;
var expect = require(__BASE + '/test/helpers').expect;
var datePicker = require(__BASE + '/src/renderers/date-picker');
var initializeState = require(__BASE + '/src/initialize-state');

describe('datePicker', function() {
  var state;

  describe('in english', function() {
    before(function() {
      state = initializeState({
        selectedDate: new Date('Sun Nov 29 2015')
      })();
    });

    it('contains the properly formatted date link', function() {
      var expected = h('div', [
        h('a', 'Nov 29, 2015'),
        h('div')
      ]);

      expect(datePicker(state)).to.look.like(expected);
    });
  });
});
