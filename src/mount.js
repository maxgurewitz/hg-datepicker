var app = require('mercury').app;

module.exports = function mount(el, opts) {
  app(el, this(opts), this.render);
};
