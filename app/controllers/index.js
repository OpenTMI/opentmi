const EventEmitter = require('events').EventEmitter;
const mongoose = require('mongoose');
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
      this.emit('get', req[this.modelName].toObject());
      res.json(req[this.modelName]);
    } else {
      const errorMsg = `get failed: Cannot get model, request does not have a value linked to key: ${this.modelName}`;
      logger.warn(errorMsg);
      res.status(500).json({error: errorMsg});
    }
  }

  find(req, res) {
    this._model.query(req.query, (error, list) => {
      if (error) {
        logger.warn(error);
        res.status(300).json({error: error.message});
      } else if (list) {
        this.emit('find', list);
        res.json(list);
      } else {
        logger.error('Query returned an undefined list!');
      }
    });
  }

  create(req, res, next) {
    const editedReq = req;
    const item = new this._model(editedReq.body);
    item.save((error) => {
      if (error) {
        logger.warn(error);

        const editedError = error;
        editedError.statusCode = 400;
        return next(editedError);
      }

      editedReq.query = req.body;
      const trimmedItem = item.toJSON();
      this.emit('create', trimmedItem);
      return res.status(200).json(trimmedItem); // Change to correct 201
    });
  }

  update(req, res) {
    const editedReq = req;
    delete editedReq.body._id;
    delete editedReq.body.__v;
    logger.debug(editedReq.body);

    const modelID = editedReq.params[this.modelName];
    if (modelID === undefined) {
      return res.status(500).json({error: 'Failed to extract id from request params.'});
    }

    const updateOpts = {runValidators: true};
    this._model.findByIdAndUpdate(modelID, editedReq.body, updateOpts, (error, doc) => {
      if (error) {
        logger.warn(error);
        res.status(400).json({error: error.message});
      } else if (!doc) {
        const errorMsg = `Could not find ${this.modelName} with _id ${editedReq.params[this.modelName]}`;
        logger.warn(errorMsg);
        res.status(404).json({error: errorMsg});
      } else {
        const trimmedDoc = doc.toJSON();
        this.emit('update', trimmedDoc);
        res.json(trimmedDoc);
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

        this.emit('remove', req.params[this.defaultModelName]);
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
