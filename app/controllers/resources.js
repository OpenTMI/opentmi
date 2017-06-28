/**
  Results Controller
*/

// native modules

// 3rd party modules
const logger = require('winston');
const async = require('async');

// own modules
const DefaultController = require('./');

class ResourcesController extends DefaultController {
  constructor() { super('Resource'); }

  static setDeviceBuild(req, res) {
    req.Resource.setDeviceBuild(req.body.build);
    res.redirect(`/api/v0/resources/${req.params.Resource}`);
  }

  static solveRoute(req, res) {
    req.Resource.solveRoute((error, route) => {
      if (error) {
        res.status(400).json({ error });
      } else {
        res.json(route);
      }
    });
  }

  static paramAlloc(req, res, next, id) {
    req.Resource.find({ 'status.allocId': req.params.Alloc }, (error, docs) => {
      if (error) {
        res.status(404).json({ error });
      } else if (docs.length > 0) {
        logger.info(`found many devices: ${docs.length}`);
        req.allocated = docs;
        next();
      } else {
        logger.info(`not found allocated resources with id: ${req.params.Alloc}`);
        res.status(404).json({ error: 'not found' });
      }
    });
  }

  static getToBody(req, res, next) {
    try {
      req.body = JSON.parse(req.query.alloc);
    } catch (err) {
      res.status(500).json({ error: err });
      return;
    }
    next();
  }

  static alloc(req, res) {
    req.Resource.alloc((error, doc) => {
      if (error) {
        res.status(500).json({ error });
      } else {
        res.json(req.allocated);
      }
    });
  }

  static release(req, res) {
    req.Resource.release((error, doc) => {
      if (error) {
        res.status(500).json({ error });
      } else {
        res.json(req.allocated);
      }
    });
  }

  static allocMultiple(req, res) {
    req.Resource.allocateResources(req.body, (error, allocated) => {
      if (error) {
        res.status(404).json({ error });
      } else {
        res.json(allocated);
      }
    });
  }

  static releaseMultiple(req, res) {
    logger.info(`Releasing: ${req.allocated.length}`);
    async.map(req.allocated, (resource, cb) => {
      logger.info(`try to release: ${resource._id}`);
      resource.release(cb);
    }, (error, results) => {
      if (!error) {
        res.json(results);
      } else {
        res.status(500).json({ error });
      }
    });
  }
}


module.exports = ResourcesController;
