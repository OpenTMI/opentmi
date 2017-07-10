const express = require('express');
const mongoose = require('mongoose');

const Route = function(app){

  const router = express.Router();

  router.route('/api/v0/addons.:format?')
    .all( function(req, res, next){
      next();
    })
    .get( function(req, res){
      res.json( global.AddonManager.AvailableModules() );
    });

    app.use( router );
};

module.exports = Route;
