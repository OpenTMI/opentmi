// native modules
const EventEmitter = require('events').EventEmitter;
// 3rd party modules
const mongoose = require('mongoose');
const _ = require('lodash');

// application modules
const logger = require('../tools/logger');

/*
  General ontrollers for "Restfull" services
*/
class DefaultController extends EventEmitter {
  constructor(modelName) {
    super();
    this._model = mongoose.model(modelName);
    this.modelName = modelName;
    this.docId = '_id';
    this.modelParam = this.defaultModelParam();
  }

  defaultModelParam() {
    // Find from db
    const modelname = this.modelName;
    const docId = this.docId;

    return (req, res, next) => {
      logger.debug(`do param ${JSON.stringify(req.params)}`);
      const find = {};
      find[docId] = req.params[modelname];
      this.Model.findOne(find, (error, data) => {
        if (error) {
          res.status(500).json({error});
        } else if (data) {
          if (typeof modelname === 'string') req[modelname] = data; // eslint-disable-line no-param-reassign
          next();
        } else {
          res.status(404).json({msg: 'not found'});
        }
      });
    };
  }

  get Model() {
    return this._model;
  }

  all(req, res, next) { // eslint-disable-line class-methods-use-this
    // dummy middleman function..
    next();
  }

  get(req, res) {
    if (req[this.modelName]) {
      const doc = req[this.modelName].toObject();
      this.emit('get', doc);
      res.json(doc);
    } else {
      const errorMsg = `get failed: Cannot get model, request does not have a value linked to key: ${this.modelName}`;
      logger.warn(errorMsg);
      res.status(500).json({error: errorMsg});
    }
  }

  find(req, res) {
    this._model.leanQuery(req.query)
      .then(list => {
        this.emit('find', list);
        res.json(list);
      })
      .catch(error => {
        logger.warn(error);
        res.status(500).json({error: error.message});
      });
  }

  create(req, res) {
    const editedReq = req;
    const item = new this._model(editedReq.body);
    item.save((error) => {
      if (error) {
        logger.warn(error);
        if (res) res.status(400).json({error: error.message});
      } else {
        editedReq.query = req.body;
        const jsonItem = item.toObject();
        this.emit('create', jsonItem);
        res.json(jsonItem);
      }
    });
  }

  update(req, res) {
    const update = _.omit(req.body, ['_id', '__v']);
    // increment version number every time when updating document
    update.$inc = {__v: 1};
    logger.debug(update);

    const modelID = req.params[this.modelName];
    if (modelID === undefined) {
      return res.status(500).json({error: 'Failed to extract id from request params.'});
    }
    const query = {_id: modelID};
    if (_.has(req.body, '__v')) {
      // if version number is included use it when updating
      // to avoid update collisions (multiple parallel writers)
      query.__v = parseInt(req.body.__v, 10);
      logger.silly(`Use version '${query.__v}' for updating ${modelID}`);
    }
    const updateOpts = {runValidators: true, new: true};
    this._model.findOneAndUpdate(query, update, updateOpts, (error, doc) => {
      if (error) {
        logger.warn(error);
        res.status(400).json({error: error.message});
      } else if (doc) {
        this.emit('update', doc.toObject());
        res.json(doc.toObject());
      } else {
        // if we didn't get document it might be that version number was invalid,
        // double check if that is the case ->
        this._model.findById(modelID, (err, found) => {
          if (err) {
            logger.warn(err);
            res.status(400).json({error: err.message});
          } else if (found) {
            res.status(409).json(found.toObject()); // conflicting with another update request
          } else {
            res.status(404).json({message: 'document not found'});
          }
        });
      }
    });

    return undefined;
  }

  remove(req, res) {
    if (req[this.modelName]) {
      req[this.modelName].remove((error) => {
        if (error) {
          logger.warn(error.message);
          return res.status(400).json({error: error.message});
        }
        const item = req.params[this.defaultModelName];
        this.emit('remove', item.toObject());
        return res.status(200).json({});
      });
    } else {
      const errorMsg = `remove failed: Cannot get model, request has no value linked to key: ${this.modelName}`;
      logger.warn(errorMsg);
      res.status(500).json({error: errorMsg});
    }
  }

  // extra functions
  isEmpty(next) {
    this._model.count({}, (error, count) => {
      if (error) next(error);
      else if (count === 0) next(true);
      else next(false);
    });
  }
}


module.exports = DefaultController;
