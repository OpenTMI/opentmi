/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const logger = require('winston');

// Local components
const {setup, reset, teardown} = require('./mongomock');
const Group = require('./../../app/models/group.js').Model;
const User = require('./../../app/models/user.js').Model;
const UsersController = require('./../../app/controllers/users.js');

// Setup
logger.level = 'error';
chai.use(chaiSubset);

// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/users.js', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);
  after(teardown);

  it('constructor', function () {
    controller = new UsersController();
    expect(controller).to.exist;
  });
  describe('user model', function () {
    describe('password', function () {
      it('salt password by default', function () {
        const user = new User({password: 'ohhoh'});
        return user
          .save()
          .then(() => user.comparePassword('ohhoh'))
          .then(() => user.comparePassword('ohhohh'))
          .reflect()
          .then((promise) => {
            expect(promise.isRejected()).to.be.true;
          });
      });
      it('can change password', function () {
        const user = new User({password: 'ohhoh'});
        return user.save()
          .then(() => user.saltPassword('abc'))
          .then(() => user.comparePassword('abc'))
          .then(() => user.comparePassword('ohhoh'))
          .reflect()
          .then((promise) => {
            expect(promise.isRejected()).to.be.true;
          });
      });
    });

    it('allow to add to group and remove from group', function () {
      const admins = new Group({name: 'admins'});
      return admins.save()
        .then(() => {
          const user = new User();
          return user.save();
        })
        .then(user => user.addToGroup('admins'))
        .then(user => user.removeFromGroup('admins'));
    });
    it('reject to remove from group if not included', function () {
      const admins = new Group({name: 'admins'});
      return admins.save()
        .then(() => {
          const user = new User();
          return user.save();
        })
        .then(user => user.removeFromGroup('admins'))
        .reflect()
        .then((promise) => {
          expect(promise.isRejected()).to.be.true;
        });
    });
    it('isAdmin', function () {
      const admins = new Group({name: 'admins'});
      return admins.save()
        .then(() => {
          const user = new User();
          return user.save();
        })
        .then(user => user.isAdmin()
          .then((yes) => {
            expect(yes).to.be.false;
          })
          .then(() => user.addToGroup('admins')))
        .then(user => user.isAdmin()
          .then((yes) => {
            expect(yes).to.be.true;
          })
          .then(() => user.removeFromGroup('admins')))
        .then(user => user.isAdmin()
          .then((yes) => {
            expect(yes).to.be.false;
          }));
    });
  });
});
