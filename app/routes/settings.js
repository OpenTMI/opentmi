// 3rd party modules
const express = require('express');
const nconf = require('nconf');
// application
const {ensureAdmin} = require('./middlewares/authorization');


function get(req, res) {
  res.json(nconf.get());
}

function put(req, res) {
  res.json(501, {error: 'not implemented'});
}

function Route(app) {
  const router = express.Router();

  router.route('/api/v0/settings')
    .all(...ensureAdmin)
    .get(get)
    .put(put);

  app.use(router);
}

module.exports = Route;
