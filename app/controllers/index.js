'use strict';

const logger = require('winston');
const EventEmitter = require('events').EventEmitter;
const mongoose = require('mongoose');

/*
  General ontrollers for "Restfull" services
*/
class DefaultController extends EventEmitter {
  constructor(pModelName) {
    super();
    this._model = mongoose.model(pModelName);
    this.modelName = pModelName;
    this.docId = '_id';
    this.modelParam = this.defaultModelParam();
  }

  defaultModelParam() {
    // Find from db
    const modelname = this.modelName;
    const docId = this.docId;

    return (req, res, next, id) => {
      logger.debug(`do param ${JSON.stringify(req.params)}`);
      const find = {};
      find[docId] = req.params[modelname];
      this.Model.findOne(find, (error, data) => {
        if (error) {
          res.status(300).json({ error });
        } else if (data) {
          if (typeof modelname === 'string') req[modelname] = data;
          next();
        } else {
          res.status(404).json({ msg: 'not found' });
        }
      });
    };
  }

  get Model() {
    return this._model;
  }

  all(req, res, next) {
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
      res.status(500).json({ error: errorMsg });
    }
  }

  find(req, res) {
    console.log('finding...')
    this._model.query(req.query, (error, list) => {
      console.log('results...')
      if (error) {
        logger.warn(error);
        res.status(300).json({ error: error.message });
      } else {
        this.emit('find', list);
        res.json(list);
      }
    });
  }

  create(req, res) {
    const item = new this._model(req.body);
    item.save((error) => {
      if (error) {
        logger.warn(error);
        if (res) res.status(400).json({ error: error.message });
      } else { // if (res) {
        req.query = req.body;
        this.emit('create', item.toObject());
        res.json(item);
      }
    });
  }

  update(req, res) {
    delete req.body._id;
    delete req.body.__v;
    logger.debug(req.body);

    const updateOpts = { runValidators: true };
    this._model.findByIdAndUpdate(req.params[this.modelName], req.body, updateOpts, (error, doc) => {
      if (error) {
        logger.warn(error);
        res.status(400).json({ error: error.message });
      } else {
        this.emit('update', doc.toObject());
        res.json(doc);
      }
    });
  }

  remove(req, res) {
    if (req[this.modelName]) {
      req[this.modelName].remove((err) => {
        if (err) {
          logger.warn(err.message);
          return res.status(400).json({ error: err.message });
        }

        this.emit('remove', req.params[this.defaultModelName]);
        return res.status(200).json({});
      });
    } else {
      const errorMsg = `remove failed: Cannot get model, request does not have a value linked to key: ${this.modelName}`;
      logger.warn(errorMsg);
      res.status(500).json({ error: errorMsg });
    }
  }

  // extra functions
  isEmpty(cb) {
    this._model.count({}, (error, count) => {
      if (error) cb(error);
      else if (count === 0) cb(true);
      else cb(false);
    });
  }
}


module.exports = DefaultController;
