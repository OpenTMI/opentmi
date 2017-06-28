const mongoose = require('mongoose');
const restify = require('express-restify-mongoose');
const _ = require('lodash');
const logger = require('winston');

const Route = function (app, passport) {
  // easy way, but not support format -functionality..
  const Group = mongoose.model('Group');
  restify.serve(app, Group, {
    version: '/v0',
    name: 'groups',
    idProperty: '_id',
    protected: '__v',
  });

  Group.count({}, (err, count) => {
    if (count === 0) {
      (new Group({ name: 'admins', users: [] })).save();
      (new Group({ name: 'users', users: [] })).save();
    }
  });

  Group.getUsers('admins', (error, users) => {
    const admins = _.map(users, (user) => { return user.name || user.displayName || user.email; });
    logger.info('Admin Users: ' + admins.join(','));
  });
};

module.exports = Route;