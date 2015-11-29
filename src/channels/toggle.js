module.exports = function toggle(state) {
  if (!state.model.isOpen()) {
    state.model.isPopUpTop.set(state.model.isButtonInBottomHalf());
  }

  state.model.isOpen.set(!state.model.isOpen());
};
