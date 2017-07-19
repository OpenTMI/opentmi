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
        res.status(400).json({error});
      } else {
        res.json(route);
      }
    });
  }

  static paramAlloc(pReq, pRes, pNext) {
    pReq.Resource.find({'status.allocId': pReq.params.Alloc}, (pFindError, pDocs) => {
      if (pFindError) {
        pRes.status(404).json({error: pFindError});
      } else if (pDocs.length > 0) {
        logger.info(`found many devices: ${pDocs.length}`);
        pReq.allocated = pDocs; // eslint-disable-line no-param-reassign
        pNext();
      } else {
        logger.info(`no allocated resources with id: ${pReq.params.Alloc}`);
        pRes.status(404).json({error: 'not found'});
      }
    });
  }

  static getToBody(pReq, pRes, pNext) {
    try {
      pReq.body = JSON.parse(pReq.query.alloc); // eslint-disable-line no-param-reassign
    } catch (err) {
      pRes.status(500).json({error: err});
      return;
    }
    pNext();
  }

  static alloc(req, res) {
    req.Resource.alloc((pError) => {
      if (pError) {
        res.status(500).json({error: pError});
      } else {
        res.json(req.allocated);
      }
    });
  }

  static release(req, res) {
    req.Resource.release((error) => {
      if (error) {
        res.status(500).json({error});
      } else {
        res.json(req.allocated);
      }
    });
  }

  static allocMultiple(req, res) {
    req.Resource.allocateResources(req.body, (error, allocated) => {
      if (error) {
        res.status(404).json({error});
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
    }, (pError, pResults) => {
      if (!pError) {
        res.json(pResults);
      } else {
        res.status(500).json({error: pError});
      }
    });
  }
}


module.exports = ResourcesController;
