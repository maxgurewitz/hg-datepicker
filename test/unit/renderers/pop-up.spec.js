var expect = require(__BASE + '/test/helpers').expect;
var popUp = require(__BASE + '/src/renderers/pop-up');
var initializeState = require(__BASE + '/src/initialize-state');

describe('popUp', function() {
  var state;

  beforeEach(function() {
    state = initializeState()();
  });

  describe('when pop up is oriented up', function() {
    beforeEach(function() {
      state.model.isPopUpTop = true;
    });

    it('has a negative top', function() {
      expect(popUp(state).properties.style).to.containSubset({ top: '-18em' });
    });
  });

  describe('when pop up is oriented down', function() {
    beforeEach(function() {
      state.model.isPopUpTop = false;
    });

    it('its top is not set', function() {
      expect(popUp(state).properties.style.top).to.be.undefined;
    });
  });

  describe('when the pop up is closed', function() {
    beforeEach(function() {
      state.model.isOpen = false;
    });

    it('it is hidden by reducing its margin, opacity etc.', function() {
      expect(popUp(state).properties.style).to.containSubset({
        margin: 0,
        opacity: 0,
        padding: 0,
        zIndex: -2000
      });
    });

    describe('when pop up is oriented down', function() {
      beforeEach(function() {
        state.model.isPopUpTop = false;
      });

      it('its translate y is set appropriately to create the desired animation', function() {
        expect(popUp(state).properties.style).to.containSubset({ transform: 'translateY(-1em) perspective(600px) rotateX(0)' });
      });
    });

    describe('when pop up is oriented up', function() {
      beforeEach(function() {
        state.model.isPopUpTop = true;
      });

      it('its translate y is set appropriately to create the desired animation', function() {
        expect(popUp(state).properties.style).to.containSubset({ transform: 'translateY(1em) perspective(600px) rotateX(0)' });
      });
    });
  });

  describe('when the pop up is open', function() {
    beforeEach(function() {
      state.model.isOpen = true;
    });

    it('its margin, opacity etc. are not set to 0', function() {
      expect(popUp(state).properties.style).to.not.containSubset({
        margin: 0,
        opacity: 0,
        padding: 0,
        zIndex: -2000
      });
    });

    it('no transform is applied', function() {
      expect(popUp(state).properties.style.transform).to.equal('translateY(0em) perspective(600px) rotateX(0)');
    });
  });
});
