/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const chaiSubset = require('chai-subset');

// Local components
const {setup, reset, teardown} = require('../../utils/mongomock');
require('./../../../app/models/testcase.js');
const TestcasesController = require('./../../../app/controllers/testcases.js');

// Setup
chai.use(chaiSubset);

// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/testcases.js', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);
  after(teardown);

  it('constructor', function (done) {
    controller = new TestcasesController();
    expect(controller).to.exist;
    done();
  });
});
