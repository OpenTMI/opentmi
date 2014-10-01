var fs = require('fs');

function AddonSample (app, passport){
  app.get('/test', function(req, res){
    res.json({ok: 1});
  });
}

//AddonExpress


exports = module.exports = AddonSample;