const mongoose = require('mongoose');
const _ = require('lodash');
const logger = require('winston');
const express = require('express');
// application modules
const GroupController = require('../controllers/groups');

const Route = function (app) {
  // easy way, but not support format -functionality..
  const Group = mongoose.model('Group');

  const router = express.Router();
  const controller = new GroupController();

  router.param('Group', controller.modelParam.bind(controller));

  router.route('/api/v0/groups.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/groups/:Group.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  app.use(router);

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
