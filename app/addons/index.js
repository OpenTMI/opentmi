var fs = require('fs');
var express = require('express');
var _ = require('underscore')
var winston = require('winston')
var async = require('async');

function AddonManager (app, server, io, passport){
  var self = this;
  var addons = [];
  
  this.RegisterAddons = function() {
    
    fs.readdirSync(__dirname).forEach(function (item) {
      addonPath =  __dirname+'/'+item;
      addonPckJson = addonPath+'/package.json';
      addonPathStat = fs.lstatSync(addonPath);
      if (addonPathStat.isDirectory() && 
          fs.existsSync(addonPckJson) ){
        winston.info("-RegisterAddon: '"+item+"'");
        try {
          var Addon = require(addonPath);
          var addon = new Addon(app, server, io, passport);
          var addonDoc = require(addonPckJson);
          var addonPublic = addonPath+'/public';
          console.log(addonPublic)
          addonDoc.obj = addon; 
          addon.register();
          if( fs.existsSync(addonPublic)) {
            console.log('publish addon public folder');
            addonDoc.opentmi.config.public = '/addons/'+addonDoc.name;
            console.log(addonDoc.opentmi.config.public)
            app.use(addonDoc.opentmi.config.public, 
                    express.static(addonPublic));
          }
           addons.push( addonDoc );
        } catch(e) {
          console.log(e);
          winston.error(e);
        }
      }
    });  

  };
  this.listAddons = function() {
    return addons;
  };

  this.UnregisterModule = function(i, cb){
    if( addons.length < i ) return false;
    addons[i].unregister(cb);
    addons.splice(i, 1);
  }

  return this;
}

exports = module.exports = AddonManager;