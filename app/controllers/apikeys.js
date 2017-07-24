const _ = require('lodash');
const mongoose = require('mongoose');

const User = mongoose.model('User');
const ApiKey = mongoose.model('ApiKey');

module.exports = {
  keys: (req, res) => {
    ApiKey.find({}, (error, keys) => {
      if (error) {
        return res.status(401).send({message: error});
      }

      return res.send(_.map(keys, key => key.key));
    });
  },
  userKeys: (req, res) => {
    User.getApiKeys(req.user.sub, (error, keys) => {
      if (error) {
        return res.status(401).send({message: error});
      }

      return res.send(keys);
    });
  },
  createKey: (req, res) => {
    User.createApiKey(req.user.sub, (error, key) => {
      if (error) {
        return res.status(401).send({message: error});
      }

      return res.send({apikey: key});
    });
  },
  deleteKey: (req, res) => {
    User.deleteApiKey(req.user.sub, req.params.ApiKey, (error, ok) => {
      if (error) {
        return res.status(401).send({message: error});
      }

      return res.send({ok});
    });
  }
};
