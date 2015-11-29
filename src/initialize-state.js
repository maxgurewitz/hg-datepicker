var hg = require('mercury');

module.exports = function initializeState() {
  return hg.state({
    model: hg.struct({
      open: hg.value(false)
    })
  });
};
