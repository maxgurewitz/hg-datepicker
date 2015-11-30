var h = require('mercury').h;
var xtend = require('xtend');
var header = require('./header');

var styles = {
  popUp: {
    borderRadius: '3px',
    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
    boxSizing: 'border-box',
    height: '18em',
    left: 'calc(50% - 11rem)',
    padding: '1em',
    position: 'absolute',
    // FIXME: use https://www.npmjs.com/package/autoprefix
    transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, position 0.15s ease-out, height 0s 0.15s',
    width: '22em'
  }
};

module.exports = function popUp(state) {
  var popUpStyle = xtend(styles.popUp);

  if (state.model.isPopUpTop) {
    popUpStyle.top =  '-' + styles.popUp.height;
  }

  var translateY;
  if (!state.model.isOpen) {
    popUpStyle.height = 0;
    popUpStyle.margin = 0;
    popUpStyle.opacity = 0;
    popUpStyle.padding = 0;
    popUpStyle.zIndex = -2000;

    translateY = state.model.isPopUpTop ? 1 : -1;
  } else {
    translateY = 0;
  }

  popUpStyle.transform = 'translateY(' + translateY + 'em) perspective(600px) rotateX(0)';

  return h('div', {
    style: popUpStyle
  }, [
    header(state)
  ]);
};
