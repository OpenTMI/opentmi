var mongoose = require('mongoose');
var User = mongoose.model('User');
var ApiKey = mongoose.model('ApiKey');
var _ = require('lodash');

module.exports = {
  keys: function(req, res){
    ApiKey.find({}, function(error, keys){
      if(error){
        return res.status(401).send({message: error});
      }
      res.send(_.map(keys, function(key){
        return key.key;
      }));
    })
  },
  userKeys: function(req, res){
    User.getApiKeys(req.user.sub, function(error, keys){
        if(error){
          return res.status(401).send({message: error});
        }
        res.send(keys);
    });
  },
  createKey: function(req, res){
    User.createApiKey(req.user.sub, function(error, key){
      if(error){
        return res.status(401).send({message: error});
      }
      res.send({apikey: key});
    })
  },
  deleteKey: function(req, res){
    User.deleteApiKey(req.user.sub, req.params.ApiKey, function(error, ok){
      if(error){
        return res.status(401).send({message: error});
      }
      res.send({ok: ok});
    })
  }
}
