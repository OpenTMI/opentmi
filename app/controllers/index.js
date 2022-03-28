// native modules
const {EventEmitter} = require('events');
// 3rd party modules
const mongoose = require('mongoose');
const _ = require('lodash');
const invariant = require('invariant');

// application modules
const {isEmpty} = require('../models/plugins/isempty');
const logger = require('../tools/logger');

/*
  General ontrollers for "Restfull" services
*/
class DefaultController extends EventEmitter {
  constructor(modelName) {
    invariant(_.isString(modelName), 'modelName should be a string');
    super();
    this._model = mongoose.model(modelName);
    this.modelName = modelName;
    this.logger = logger;
  }

  static isObjectId(str) {
    const ObjectId = mongoose.Types.ObjectId;
    return ObjectId.isValid(str);
  }

  _getModelParamQuery(req) {
    return {_id: req.params[this.modelName]};
  }
  modelParam(req, res, next) {
    // Find from db
    logger.silly(`Register model middleware for ${this.modelName}`);
    const find = this._getModelParamQuery(req);
    logger.debug(`find document by ${JSON.stringify(find)} (model: ${this.modelName})`);
    const select = _.get(req, 'query.f', undefined);
    const timeout = parseInt(_.get(req, 'query.to', '5000'), 10);
    let populate = _.get(req, 'query.p', undefined);
    if (populate && populate[0] === '{') {
      try {
        populate = JSON.parse(populate);
      } catch (err) {
        const error = new Error(`populate json was incorrect ${err.message}`);
        error.statusCode = 400;
        throw error;
      }
    }
    return this.Model.findOne(find, select, {maxTimeMS: timeout})
      .populate(populate)
      .then((data) => {
        if (!data) {
          const error = new Error(`Document not found (${find})`);
          error.statusCode = 404;
          throw error;
        }
        _.set(req, this.modelName, data);
        next();
      })
      .catch(mongoose.CastError, () => {
        const error = new Error('Invalid document id');
        error.statusCode = 400;
        throw error;
      })
      .catch((error) => {
        const status = error.statusCode || 500;
        res.status(status).json({message: `${error}`});
      });
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
      const doc = req[this.modelName].toJSON();
      this.emit('get', doc);
      res.json(doc);
    } else {
      const errorMsg = `get failed: Cannot get model, request does not have a value linked to key: ${this.modelName}`;
      logger.warn(errorMsg);
      res.status(500).json({error: errorMsg});
    }
  }

  find(req, res) {
    this._model.leanQuery(req.query, (error, list) => {
      if (error) {
        logger.warn(error);
        res.status(300).json({error: error.message});
      } else {
        this.emit('find', list);
        res.json(list);
      }
    });
  }
  create(req, res) {
    const editedReq = req;
    return this._create(editedReq.body)
      .then((item) => {
        editedReq.query = req.body;
        const jsonItem = item.toJSON();
        this.emit('create', jsonItem);
        res.json(jsonItem);
      })
      .catch((error) => {
        logger.warn(error);
        if (res) {
          res.status(400).json({error: error.message});
        }
      });
  }
  _create(data) {
    const item = new this._model(data);
    return item.save();
  }

  update(req, res) {
    const update = _.omit(req.body, ['_id', '__v']);
    // increment version number every time when updating document
    update.$inc = {__v: 1};
    logger.debug(`updated: ${JSON.stringify(update)}`);

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
        this.emit('update', doc.toJSON());
        res.json(doc.toJSON());
      } else {
        // if we didn't get document it might be that version number was invalid,
        // double check if that is the case ->
        this._model.findById(modelID, (err, found) => {
          if (err) {
            logger.warn(err);
            res.status(400).json({error: err.message});
          } else if (found) {
            res.status(409).json(found.toJSON()); // conflicting with another update request
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
      const info = {
        collection: this.modelName,
        _id: _.get(req[this.modelName], '_id')
      };
      req[this.modelName].remove((error) => {
        if (error) {
          logger.warn(error.message);
          return res.status(400).json({error: error.message});
        }
        this.emit('remove', info);
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
    return isEmpty(this._model, next);
  }
}


module.exports = DefaultController;
