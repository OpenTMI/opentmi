const express = require('express');

const AddonManager = require('../addons');
const AddonController = require('../controllers/addons');

const Route = function (app) {
  const router = express.Router();
  const defaultAll = (req, res, next) => next();

  router.param('Addon', (req, res, next, name) => {
    req.addon = AddonManager.findAddon(name);
    if (!req.addon) {
      res.sendStatus(404);
    } else {
      next();
    }
  });

  router.route('/api/v0/addons.:format?')
    .all(defaultAll)
    .get(AddonController.listAddons);

  router.route('/api/v0/addons/register')
    .all(defaultAll)
    .post(AddonController.routePerformAction.bind(AddonController, 'registerAddon'));

  router.route('/api/v0/addons/unregister')
    .all(defaultAll)
    .post(AddonController.routePerformAction.bind(AddonController, 'unregisterAddon'));

  router.route('/api/v0/addons')
    .all(defaultAll)
    .post(AddonController.routeAddAddon);

  router.route('/api/v0/addons/:Addon')
    .all(defaultAll)
    .get((req, res) => { res.status(200).json(req.addon.toJson); })
    .delete(AddonController.routeRemoveAddon.bind(AddonController));

  app.use(router);
};

module.exports = Route;
