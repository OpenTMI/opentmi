/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const logger = require('winston');

// Local components
const {setup, reset, teardown} = require('./mongomock');
require('./../../app/models/group.js');
const GroupsController = require('./../../app/controllers/groups.js');

// Setup
logger.level = 'error';
chai.use(chaiSubset);

// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/groups.js', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);
  after(teardown);

  it('constructor', function (done) {
    controller = new GroupsController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
    done();
  });
});
