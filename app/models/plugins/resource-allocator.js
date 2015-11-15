var mongoose = require('mongoose');
var Validator = require('jsonschema').Validator;
var async = require('async');
var _ = require('underscore');
var uuid = require('node-uuid');

/**
 * @method ResourceAllocator
 * @param {mongoose.Schema} schema
 * @param {Object}          options
 * @param {Function}        [options.fn=Math.random]
 * @param {String}          [options.path='random']
 */
var ResourceAllocator = function(schema, options){
  
  var v = new Validator();

  schema.add({ 'status.allocId': {type: String } });

  var allocRequest = {
    id: '/AllocRequest',
    type: 'array',
    items: {
      "oneOf": [
        {
          "$ref": "/AllocRequestSchema"
        },
        {
          type: 'array', items: {
            "$ref": "/AllocRequestSchema"
          }
        }
      ]
    }
  }
  var AllocRequestSchema = {
    "id": "/AllocRequestSchema",
    "type": "object",
    "properties": {
      "type": {"type": "string"},
    }
  };
  v.addSchema(AllocRequestSchema, '/AllocRequest');

  schema.methods.release = function(cb){
    if( this.status.availability !== 'free') {
      this.status.availability = 'free';
      if(this.status.allocId) 
        this.status.allocId = undefined;
      this.save(cb);
      console.log('release resource');
    } else {
      console.log('resource was already released')
      cb(null, this);
    }
  }
  schema.methods.allocate = function(cb){
    if( this.status.availability !== 'reserved') {
      this.status.availability = 'reserved';
      this.status.allocId = uuid.v1();
      this.save(cb);
      console.log('resource allocated :)');
    } else {
      cb({error: 'resource already allocated for somebody else'});
    }
  }
  schema.statics.releaseResources = function(allocId, cb){
    Resource.find( {'status.allocId': allocId}, function(error, docs){
      var release = function(doc, rel_cb){
        doc.release(rel_cb);
      }
      if( error ){
        cb(error);
      } else {
        async.map(docs, release, cb);
      }
    })
  }

  schema.statics.allocateResources = function(alloc_request, cb){
    var self = this;

    var allocateResource = function( request, alloc_cb ){

      var createQueryObject = function(cb_q){
        var q = { 
          'status.value': 'active',
          'status.availability': 'free'
        }
        if(typeof request == Array) {
          _.extend(q, {$or: request});
        } else {
          _.extend(q, request);
        }
        cb_q(q);
      }
      var reserve = function(resource){
        resource.allocate(alloc_cb);
      }

      createQueryObject(function(q){
        console.log('search: '+JSON.stringify(q));
        self.find(q, function(error, results){
          if(error){
            console.log('error'+error);
            alloc_cb(error);
          } else if( results && results.length > 0){
            reserve(results[0]);
          } else {
            console.log('not found');
            alloc_cb({error: 'cannot locate required resources', request: request});
          }
        });
      });
    }  
    console.log('allocateReources: '+JSON.stringify(alloc_request));
    var result = v.validate(alloc_request, allocRequest);
    if(result.errors.length === 0){
      async.map(alloc_request, allocateResource, cb);
    }
    else { cb(result); }
  }
  console.log("ResourceAllocator registered");
}

module.exports = exports = ResourceAllocator;
