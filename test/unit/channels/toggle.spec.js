var expect = require(__BASE + '/test/helpers').expect;
var initializeState = require(__BASE + '/src/initialize-state');
var toggle = require(__BASE + '/src/channels/toggle');

describe('toggle', function() {
  var state;

  describe('when closing the popup', function() {
    before(function() {
      state = initializeState();
      state.model.isOpen.set(true);
      toggle(state);
    });

    it('isOpen is set to false', function() {
      expect(state.model.isOpen()).to.be.false;
    });
  });

  describe('when opening the popup', function() {
    before(function() {
      state = initializeState();
      state.model.isOpen.set(false);
      state.model.isButtonInBottomHalf.set(true);
      state.model.isPopUpTop.set(false);
      toggle(state);
    });

    it('isOpen is set to false', function() {
      expect(state.model.isOpen()).to.be.true;
    });

    it('isPopUpTop is set to the value of isButtonInBottomHalf', function() {
      expect(state.model.isPopUpTop()).to.be.true;
      expect(state.model.isButtonInBottomHalf()).to.be.true;
    });
  });
});
