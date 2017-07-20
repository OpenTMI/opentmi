const express = require('express');

function Route(pApp) {
  const api = express();
  const api_v0 = express(); // eslint-disable-line camelcase
  pApp.use('/api', api);
  api.use('/v0', api_v0);

  api.get('/', (req, res) => {
    res.json({
      name: pApp.get('name'),
      mode: process.env.NODE_ENV ? process.env.NODE_ENV : 'development',
      // listenscope: nconf.get('host'),
      hostname: req.hostname
    });
  });

  api_v0.get('/', (req, res) => {
    res.json({apiVersion: 'v0'});
  });

  api_v0.get('/routes.:format?', (pReq, pRes) => {
    const routes = [];
    pApp._router.stack.forEach((item) => {
      if (item.route && item.route.path) {
        const keys = Object.keys(item.route.methods);
        routes.push(`${keys[0]}:${item.route.path}`);
      }
    });
    pRes.json({routes, stack: pApp._router.stack});
  });
}

module.exports = Route;
