/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('../../chai');
const sinon = require('sinon');
const _ = require('lodash');

// Local components
const {setup, reset, teardown} = require('../../utils/mongomock');
const Group = require('./../../../app/models/group.js').Model;
const User = require('./../../../app/models/user.js').Model;
const UsersController = require('./../../../app/controllers/users.js');
const {newResponse, newRequest} = require('../helpers');

// Test variables
const {expect} = chai;

describe('controllers/users', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);
  after(teardown);

  describe('controller', function () {
    let controller = null;
    let res;

    beforeEach(function () {
      controller = new UsersController();
      res = newResponse();
    });
    it('ok', function () {
      expect(controller).to.exist;
    });
    it('create success', function () {
      const req = newRequest({name: 'myname'});
      return controller.create(req, res)
        .then(() => {
          expect(res.status.calledOnce).to.be.false;
          expect(res.json.calledOnce).to.be.true;
          expect(res.json.args[0][0].name).to.be.equal(req.body.name);
        });
    });
    it('create failed', function () {
      const req = newRequest({inval: 'id'});
      return controller.create(req, res)
        .then(() => {
          expect(res.status.calledOnceWith(400)).to.be.true;
          expect(res.json.calledOnce).to.be.true;
        });
    });
    describe('settings', function () {
      it('updateSettings', function () {
        const req = newRequest({user: 'data'}, {Namespace: 'name'});
        req.user = {update: sinon.stub()};
        const resp = _.merge({}, req.body, {nModified: 1});
        req.user.update.resolves(resp);
        return controller.updateSettings(req, res)
          .then(() => {
            expect(res.status.calledOnce).to.be.false;
            expect(res.json.calledOnceWith(req.body)).to.be.true;
          });
      });
      it('updateSettings, already reported', function () {
        const req = newRequest({user: 'data'}, {Namespace: 'name'});
        req.user = {update: sinon.stub()};
        const resp = _.merge({}, req.body, {nModified: 0});
        req.user.update.resolves(resp);
        return controller.updateSettings(req, res)
          .then(() => {
            expect(res.status.calledOnceWith(208)).to.be.true;
            expect(res.json.calledOnceWith(req.body)).to.be.true;
          });
      });
      it('updateSettings, failed', function () {
        const req = newRequest({user: 'data'}, {Namespace: 'name'});
        req.user = {update: sinon.stub()};
        req.user.update.rejects(new Error('ohhoh'));
        return controller.updateSettings(req, res)
          .then(() => {
            expect(res.status.calledOnceWith(500)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
          });
      });

      it('getSettings, exists', function () {
        const req = newRequest({}, {Namespace: 'name'});
        req.user = {settings: {name: {user: 'data'}}};
        return controller.getSettings(req, res)
          .then(() => {
            expect(res.status.calledOnce).to.be.false;
            const data = req.user.settings.name;
            expect(res.json.calledOnceWith(data)).to.be.true;
          });
      });
      it('getSettings, not exists', function () {
        const req = newRequest({}, {Namespace: 'name'});
        req.user = {settings: {name2: {user: 'data'}}};
        return controller.getSettings(req, res)
          .then(() => {
            expect(res.status.calledOnce).to.be.false;
            expect(res.json.calledOnceWith({})).to.be.true;
          });
      });
      it('deleteSettings, exists', function () {
        const req = newRequest({}, {Namespace: 'name'});
        req.user = {update: sinon.stub()};
        const resp = _.merge({}, req.body, {nModified: 1});
        req.user.update.resolves(resp);
        return controller.deleteSettings(req, res)
          .then(() => {
            expect(res.status.calledOnce).to.be.false;
            expect(res.json.calledOnceWith({})).to.be.true;
          });
      });
      it('deleteSettings, not exists', function () {
        const req = newRequest({}, {Namespace: 'name'});
        req.user = {update: sinon.stub()};
        const resp = _.merge({}, req.body, {nModified: 0});
        req.user.update.resolves(resp);
        return controller.deleteSettings(req, res)
          .then(() => {
            expect(res.status.calledOnceWith(404)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
          });
      });
    });
  });
  describe('model', function () {
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
          const user = new User({name: 'dummy'});
          return user.save();
        })
        .then(user => user.addToGroup('admins'))
        .then(user => user.removeFromGroup('admins'));
    });
    it('do not duplicate users in same group', function () {
      const admins = new Group({name: 'admins'});
      return admins.save()
        .then(() => {
          const user = new User({name: 'dummy'});
          return user.save();
        })
        .then(user => user.addToGroup('admins'))
        .then(user => user.addToGroup('admins'))
        .then((user) => {
          expect(user.groups.length).to.be.equal(1);
          return Group.findOne({name: 'admins'})
            .then((group) => {
              expect(group.users.length).to.be.equal(1);
            }).return(user);
        })
        .then(user => user.removeFromGroup('admins'))
        .then((user) => {
          expect(user.groups.length).to.be.equal(0);
          return Group.findOne({name: 'admins'})
            .then((group) => {
              expect(group.users.length).to.be.equal(0);
            });
        });
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
          const user = new User({name: 'dummy'});
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
