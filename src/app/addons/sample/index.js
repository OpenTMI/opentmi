function AddonSample (app, passport){
  app.get('/test', function(req, res){
    res.json({ok: 1});
  });
}

exports = module.exports = AddonSample;