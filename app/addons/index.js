//internal modules
var fs = require('fs');
var path = require('path');

//3rd party modules
var _ = require('lodash')
var winston = require('winston')
var async = require('async');

function AddonManager (app, server, io){
  var self = this;
  var addons = [];

  this.RegisterAddons = function() {

    fs.readdirSync(__dirname).forEach(function (file) {
      if (!file.match(/\.js$/) && !file.match(/^\./) ) {
         winston.info("-RegisterAddon: '"+file+"'");
         var addonPath = path.join(__dirname, file)
         try {
           let packageJsonFile = path.join(addonPath, 'package.json');
           let packageJson = require(packageJsonFile);
           let deps = Object.keys(_.get(packageJson, 'dependencies', {}));
           _.each(deps, (dep) => {
              try {
                  require.resolve(dep);
              } catch(e) {
                  winston.warn(dep + " npm package is not found");
                  deps = false;
              }
           });
           if(deps === false) {
             winston.warn("skip loading addon "+file);
             return;
           }
         } catch(e){
           winston.debug(e);
         }
         try {
           var Addon = require(addonPath);
           if(Addon.disabled) {
             winston.info('Addon %s is disabled', file);
             return;
           }
           var addon = new Addon(app, server, io);
           addon.register();
           addons.push( addon  );
         } catch(e) {
            addonPath = path.relative('.', addonPath)
            winston.error('Cannot load addon "%s": %s', addonPath, e.toString());
            winston.debug(e.stack);
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
