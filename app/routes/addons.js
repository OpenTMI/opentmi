const express = require('express');
const AddonManager = require('../addons');

function Route(pApp) {
  const router = express.Router();

  router.route('/api/v0/addons.:format?')
    .all((pReq, pRes, pNext) => {
      pNext();
    })
    .get((pReq, pRes) => {
      pRes.json(AddonManager.AvailableModules());
    });

  pApp.use(router);
}

module.exports = Route;
