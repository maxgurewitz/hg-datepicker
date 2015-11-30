var chai = require('chai');
var chaiVirtualDom = require('chai-virtual-dom');
var chaiSubset = require('chai-subset');
var chaiJoi = require('chai-joi');
var joi = require('joi');
var chaiThings = require('chai-things');

chai.use(chaiVirtualDom);
chai.use(chaiSubset);
chai.use(chaiJoi);
chai.use(chaiThings);

module.exports = {
  expect: chai.expect,
  joi: joi
};
