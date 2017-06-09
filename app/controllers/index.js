'use strict';

const winston = require('winston');
const EventEmitter = require('events').EventEmitter;
const mongoose = require('mongoose');

/*
  General ontrollers for "Restfull" services
*/
class DefaultController extends EventEmitter {
  constructor(pModelName, docId) {
    super();

    this._model = mongoose.model(pModelName);
    this.modelName = pModelName;
    this.docId = docId || '_id';
    EventEmitter.call(this);

    this.paramFormat = DefaultController.defaultParamFormat();
    this.modelParam = this.defaultModelParam();
  }

  static defaultParamFormat() {
    return (req, res, next, id) => {
      if (req.params.format === 'html') {
        const redirurl = `/#${req.url.match(/\/api\/v0(.*)\.html/)[1]}`;
        res.redirect(redirurl);
      } else {
        next();
      }
    };
  }

  defaultModelParam(pModelname, errorCb, successCb) {
    // Find from db
    const modelname = pModelname || this.modelName;

    return (req, res, next, id) => {
      winston.debug(`do param ${JSON.stringify(req.params)}`);
      const find = {};
      find[this.docId] = req.params[modelname];

      this.Model.findOne(find, (error, data) => {
        if (error) {
          if (errorCb) errorCb(error);
          else res.status(300).json({ error });
        } else if (data) {
          if (typeof modelname === 'string') req[modelname] = data;
          if (successCb) successCb();
          else next();
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
      const errorMsg = `Cannot get model, request does not have a value linked to key: ${this.modelName}`;
      winston.warn(errorMsg);
      res.status(300).json({ error: errorMsg });
    }
  }

  find(req, res) {
    this._model.query(req.query, (error, list) => {
      if (error) {
        res.status(300).json({ error });
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
        winston.warn(error);
        if (res) res.status(400).json({ error });
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
    winston.debug(req.body);

    this._model.findByIdAndUpdate(req.params[this.modelName], req.body, (error, doc) => {
      if (error) {
        res.status(300).json({ error });
      } else {
        this.emit('update', doc.toObject());
        res.json(doc);
      }
    });
  }

  remove(req, res) {
    req[this.modelName].remove((err) => {
      if (err) {
        winston.error(err.message);
        return res.status(400).json({ error: err.message });
      }

      this.emit('remove', req.params[this.defaultModelName]);
      return res.status(200).json({});
    });
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
