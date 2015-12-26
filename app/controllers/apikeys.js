var mongoose = require('mongoose');
var User = mongoose.model('User');
var ApiKey = mongoose.model('ApiKey');
var _ = require('underscore');

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
    User.getApiKeys(req.user, function(error, keys){
        if(error){
          return res.status(401).send({message: error});
        }
        res.send(keys);
    });
  },
  createKey: function(req, res){
    User.createApiKey(req.user, function(error, key){
      if(error){
        return res.status(401).send({message: error});
      }
      res.send({apikey: key});
    })
  },
  deleteKey: function(req, res){
    User.deleteApiKey(req.user, req.params.ApiKey, function(error, ok){
      if(error){
        return res.status(401).send({message: error});
      }
      res.send({ok: ok});
    })
  }
}
