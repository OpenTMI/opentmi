const express = require('express');
const AddonManager = require('../addons');

function Route(app) {
  const router = express.Router();

  router.route('/api/v0/addons.:format?')
    .all((req, res, next) => {
      next();
    })
    .get((req, res) => {
      res.json(AddonManager.AvailableModules());
    });

  app.use(router);
}

module.exports = Route;
