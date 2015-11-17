var fs = require('fs');
var _ = require('underscore')
var winston = require('winston')
var async = require('async');

function AddonManager (app, server, io, passport){
  var self = this;
  var addons = [];
  
  this.RegisterAddons = function() {
    
    fs.readdirSync(__dirname).forEach(function (file) {
      if (!file.match(/\.js$/) && !file.match(/^\./) ) {
         winston.info("-RegisterAddon: '"+file+"'");
         try {
           var Addon = require(__dirname + '/' + file);
           var addon = new Addon(app, server, io, passport);
           addon.register();
           addons.push( addon  );
         } catch(e) {
            console.log(e);
            winston.error(e);
         }
      }
    });  

    app.get('/addons', listAddons);

  };
  var listAddons = function(req, res){
    var list = []
    _.each(addons, function(addon){
      lis.push( addon );
    })
    res.json(list);
  }
  this.AvailableModules = function() {
    return _.map(addons, function(addon){return {name: addon.name, state: 'active'}});
  };

  this.UnregisterModule = function(i, cb){
    if( addons.length < i ) return false;
    addons[i].unregister(cb);
    addons.splice(i, 1);
  }

  return this;
}

exports = module.exports = AddonManager;