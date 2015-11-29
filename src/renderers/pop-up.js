var h = require('mercury').h;
var xtend = require('xtend');

var styles = {
  popUp: {
    borderRadius: '3px',
    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
    boxSizing: 'border-box',
    height: '18em',
    left: 'calc(50% - 11rem)',
    padding: '1em',
    position: 'absolute',
    transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, position 0.15s ease-out, height 0s 0.15s',
    width: '22em'
  }
};

module.exports = function popUp(state) {
  var popUpStyle = xtend(styles.popUp);

  if (state.model.isPopUpTop) {
    popUpStyle.top =  String(-styles.popUp.height);
  }

  if (!state.model.isOpen) {
    popUpStyle.padding = 0;
    popUpStyle.margin = 0;
    popUpStyle.height = 0;
    popUpStyle.opacity = 0;
    popUpStyle.zIndex = -2000;

    var translateY = state.model.isPopUpTop ? 1 : -1;
    popUpStyle.transform = 'translateY(' + translateY + 'em) perspective(600px)';
  }

  return h('div', {
    style: popUpStyle
  }, 'popup');
};
