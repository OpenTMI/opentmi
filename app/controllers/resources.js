/**
  Results Controller
*/

// native modules

// 3rd party modules
var mongoose = require('mongoose');
var async = require('async');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Resource = mongoose.model('Resource');
  var defaultCtrl = new DefaultController(Resource, 'Resource');

  function randomIntInc(low, high) {
    return Math.floor((Math.random() * (high - low + 1)) + low);
  }
  function randomText(list) {
    var i = randomIntInc(0, list.length - 1);
    return list[i];
  }

  this.paramFormat = defaultCtrl.format();
  this.paramResource = defaultCtrl.modelParam();

  this.all = (req, res, next) => {
    // dummy middleman function..
    next();
  };

  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  this.setDeviceBuild = (req, res) => {
    req.Resource.setDeviceBuild(req.body.build);
    res.redirect('/api/v0/resources/'+req.params.Resource);
  };

  this.solveRoute = (req, res) => {
    req.Resource.solveRoute((error, route) => {
      res.json(route);
    });
  };

  this.paramAlloc = (req, res, next, id) => {
    Resource.find({ 'status.allocId': req.params.Alloc }, (error, docs) => {
      if (error) {
        res.status(404).json({ error: error });
      } else if (docs.length > 0) {
        console.log("found many devices: " + docs.length);
        req.allocated = docs;
        next();
      } else {
        console.log('not found allocated resources with id: '+req.params.Alloc);
        res.status(404).json({ error: 'not found' });
      }
    });
  };

  this.getToBody = (req, res, next) => {
    try {
      req.body = JSON.parse(req.query.alloc);
    } catch (err) {
      res.status(500).json({ error: err });
      return;
    }
    next();
  };

  this.alloc = (req, res) => {
    req.Resource.alloc((error, doc) => {
      if (error) {
        res.status(500).json(error);
      } else {
        res.json(allocated);
      }
    });
  };

  this.release = (req, res) => {
    req.Resource.release((error, doc) => {
      if (error) {
        res.status(500).json(error);
      } else {
        res.json(allocated);
      }
    });
  };

  this.allocMultiple = (req, res) => {
    Resource.allocateResources(req.body, (error, allocated) => {
      if (error) {
        res.status(404).json(error);
      } else {
        res.json(allocated);
      }
    });
  };

  this.releaseMultiple = (req, res) => {
    console.log('Releasing: ' + req.allocated.length);
    async.map(
      req.allocated,
      (resource, cb) => {
        console.log('try to release: ' + resource._id);
        resource.release(cb);
      },
      (error, results) => {
        if (!error) {
          res.json(results);
        }
      });
  };

  return this;
};


module.exports = Controller;
