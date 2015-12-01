var generateMonth = require(__BASE + '/src/generate-month');
var helpers = require(__BASE + '/test/helpers');

var expect = helpers.expect;
var joi = helpers.joi;

describe('generateMonth', function() {
  // FIXME: add test for other language, with another first day
  var monthSchema = joi.object({
    name: joi.string(),
    displayedDays: joi.array().items(joi.object({
      dayOfMonth: joi.number(),
      isDisabled: joi.boolean()
    }))
  });

  describe('december 2015', function() {
    var currentDay = 5;
    var december2015 = generateMonth({
      currentDay: currentDay,
      currentMonth: 11,
      currentYear: 2015,
      month: 11,
      firstDay: 0,
      year: 2015
    });

    var isDisabled = december2015.displayedDays.map(function(day) {
      return day.isDisabled;
    });

    var daysOfMonth = december2015.displayedDays.map(function(dd) {
      return dd.dayOfMonth;
    });

    it('generates correctly formatted output', function() {
      expect(joi.validate(december2015, monthSchema)).to.validate;
    });

    it('sets the correct number of days in the last month', function() {
      expect(daysOfMonth.slice(0, 3)).to.eql([29, 30, 1]);
    });

    it('sets the correct number of days in the next month', function() {
      expect(daysOfMonth.slice(daysOfMonth.length - 10, daysOfMonth.length))
        .to.eql([31, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('the calendar displays the right number of days', function() {
      expect(december2015.displayedDays).to.have.length(42);
    });

    it('disables days from the previous month', function() {
      expect(isDisabled.slice(0, 2)).to.all.equal(true);
    });

    it('disables days from december before the current date', function() {
      expect(isDisabled.slice(2, currentDay + 1)).to.all.equal(true);
    });

    it('enables days from december on or after the current date', function() {
      expect(isDisabled.slice(currentDay + 2,  33)).to.all.equal(false);
    });

    it('disables days from the next month', function() {
      expect(isDisabled.slice(33, 42)).to.all.equal(true);
    });
  });

  describe('november 2015', function() {
    var november2015 = generateMonth({
      currentDay: 6,
      currentMonth: 10,
      currentYear: 2015,
      month: 10,
      year: 2015
    });

    it('starts with november first', function() {
      expect(november2015.displayedDays[0].dayOfMonth).to.equal(1);
    });
  });
});
