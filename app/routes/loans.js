// Third party modules
const express = require('express');

// Application modules
const {requireAuth, ensureAdmin} = require('./middlewares/authorization');
const LoanController = require('../controllers/loans');

function Route(app) {
  const router = express.Router();
  const controller = new LoanController();

  router.param('Loan', controller.modelParam.bind(controller));

  router.route('/api/v0/loans.:format?')
    .all(...ensureAdmin)
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/loans/me')
    .all(requireAuth)
    .get(controller.findUsersLoans.bind(controller));

  router.route('/api/v0/loans/:Loan.:format?')
    .all(...ensureAdmin)
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  app.use(router);
}

module.exports = Route;
