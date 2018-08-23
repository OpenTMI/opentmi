// Third party modules
const express = require('express');
const jwt = require('express-jwt');

// Application modules
const nconf = require('../tools/config');
const auth = require('./middlewares/authorization');
const LoanController = require('./../controllers/loans');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app) {
  const router = express.Router();
  const controller = new LoanController();

  router.param('Loan', controller.modelParam.bind(controller));

  router.route('/api/v0/loans.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.find.bind(controller))
    .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.create.bind(controller));

  router.route('/api/v0/loans/me')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, controller.findUsersLoans.bind(controller));

  router.route('/api/v0/loans/:Loan.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.get.bind(controller))
    .put(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.update.bind(controller))
    .delete(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.remove.bind(controller));

  app.use(router);
}

module.exports = Route;
