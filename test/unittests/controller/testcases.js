/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const {expect} = require('../../chai');

// Local components
const {setup, reset, teardown} = require('../../utils/mongomock');
require('../../../app/models/testcase.js');
const TestcasesController = require('../../../app/controllers/testcases.js');

// Test variables
let controller = null;

describe('controllers/testcases.js', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);
  after(teardown);

  it('constructor', function () {
    controller = new TestcasesController();
    expect(controller).to.exist;
  });
});
