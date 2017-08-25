const express = require('express');
const nconf = require('../../config');

const admin = nconf.get('admin');

function isAdmin(req, res, next) {
  if (req.query.pwd && admin && req.query.pwd === admin.pwd) {
    next();
  } else {
    res.status(500).json({error: 'Not allowed'});
  }
}

function get(req, res) {
  res.json(nconf.get());
}

function put(req, res) {
  res.json(501, {error: 'not implemented'});
}

function Route(app) {
  const router = express.Router();

  router.route('/api/v0/settings.:format?')
    .all(isAdmin)
    .get(get)
    .put(put);

  app.use(router);
}

module.exports = Route;
