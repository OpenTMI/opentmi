// Third party moduls
const mongoose = require('mongoose');
const _ = require('lodash');
const logger = require('../tools/logger');
const express = require('express');

// Application modules
const GroupController = require('../controllers/groups');

// Route variables
const Group = mongoose.model('Group');

function Route(app) {
  // easy way, but not support format -functionality..
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

  Group.count({}, (error, count) => {
    if (error) {
      logger.error(error);
      return;
    }
    if (count === 0) {
      (new Group({name: 'admins', users: []})).save();
      (new Group({name: 'users', users: []})).save();
    }
  });

  Group.getUsers('admins', (error, users) => {
    if (error) {
      logger.error(error);
      return;
    }
    const admins = _.map(users, user => user.name || user.displayName || user.email);
    logger.info(`Admin Users: ${admins.join(',')}`);
  });
}

module.exports = Route;
