const cluster = require('cluster');
const express = require('express');

function Route(app) {
  const api = express();
  const api_v0 = express(); // eslint-disable-line camelcase
  app.use('/api', api);
  api.use('/v0', api_v0);

  api.get('/', (req, res) => {
    res.json({
      name: app.get('name'),
      mode: process.env.NODE_ENV ? process.env.NODE_ENV : 'development',
      // listenscope: nconf.get('host'),
      hostname: req.hostname,
      isMaster: cluster.isMaster
    });
  });

  api_v0.get('/', (req, res) => {
    res.json({apiVersion: 'v0'});
  });

  api_v0.get('/routes.:format?', (req, res) => {
    const routes = [];
    app._router.stack.forEach((item) => {
      if (item.route && item.route.path) {
        const keys = Object.keys(item.route.methods);
        routes.push(`${keys[0]}:${item.route.path}`);
      }
    });
    res.json({routes, stack: app._router.stack});
  });
}

module.exports = Route;
