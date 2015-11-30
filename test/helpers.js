var chai = require('chai');
var chaiVirtualDom = require('chai-virtual-dom');
var chaiSubset = require('chai-subset');

chai.use(chaiVirtualDom);
chai.use(chaiSubset);

module.exports = {
  expect: chai.expect
};
