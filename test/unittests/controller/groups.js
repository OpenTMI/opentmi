/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Local components
const {setup, reset, teardown} = require('../../utils/mongomock');
require('../../../app/models/group.js');
const GroupsController = require('../../../app/controllers/groups.js');
const chai = require('../../chai');

// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/groups.js', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);
  after(teardown);

  it('constructor', function () {
    controller = new GroupsController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
  });
});
