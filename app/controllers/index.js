'use strict';

const util = require('util');
const winston = require('winston');
const EventEmitter = require('events').EventEmitter;

/*
  General ontrollers for "Restfull" services
*/
class DefaultController extends EventEmitter {
  constructor(Model, defaultModelName, docId) {
    console.log(Model.name);

    super();
    this.Model = Model;
    this.defaultModelName = defaultModelName;
    this.docId = docId || '_id';
    EventEmitter.call(this);
  }

  static format() {
    return (req, res, next, id) => {
      if (req.params.format === 'html') {
        const redirurl = `/#${req.url.match(/\/api\/v0(.*)\.html/)[1]}`;
        res.redirect(redirurl);
      } else {
        next();
      }
    };
  }

  modelParam(pModelname, errorCb, successCb) {
    // Find from db
    const modelname = pModelname || this.defaultModelName;

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

  all(req, res, next) {
    // dummy middleman function..
    next();
  }

  get(req, res) {
    if (req[this.defaultModelName]) {
      this.emit('get', req[this.defaultModelName].toObject());
      res.json(req[this.defaultModelName]);
    } else {
      winston.warn('should not be there!');
      res.status(300).json({ error: 'some strange problemo' });
    }
  }

  find(req, res) {
    this.Model.query(req.query, (error, list) => {
      if (error) {
        res.status(300).json({ error: error });
      } else {
        this.emit('find', list);
        res.json(list);
      }
    });
  }

  create(req, res) {
    const item = new this.Model(req.body);
    item.save((error) => {
      if (error) {
        winston.warn(error);
        if (res) res.status(300).json({ error });
      } else if (res) {
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

    this.Model.findByIdAndUpdate(req.params[this.defaultModelName], req.body, (error, doc) => {
      if (error) {
        res.status(300).json({ error });
      } else {
        this.emit('update', doc.toObject());
        res.json(doc);
      }
    });
  }

  remove(req, res) {
    const find = {};
    find[this.docId] = req.params[this.defaultModelName];
    this.Model.findByIdAndRemove(find, (error, ok) => {
      if (error) {
        res.status(300).json({ error });
      } else {
        this.emit('remove', req.params[this.defaultModelName]);
        res.json({});
      }
    });
  }

  // extra functions
  isEmpty(cb) {
    this.Model.count({}, (error, count) => {
      if (error) cb(error);
      else if (count === 0) cb(true);
      else cb(false);
    });
  }
}

// Inherit functions from `EventEmitter`'s prototype
util.inherits(DefaultController, EventEmitter);

module.exports = DefaultController;
