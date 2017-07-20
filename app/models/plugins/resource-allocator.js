const Validator = require('jsonschema').Validator;
const async = require('async');
const _ = require('lodash');
const uuid = require('node-uuid');
const logger = require('winston');

/**
 * @method ResourceAllocator
 * @param {mongoose.Schema} schema
 * @param {Object}          pOptions
 * @param {Function}        [pOptions.fn=Math.random]
 * @param {String}          [pOptions.path='random']
 */
function ResourceAllocator(pSchema, pOptions) { // eslint-disable-line no-unused-vars
  const schema = pSchema;
  const v = new Validator();

  schema.add({'status.allocId': {type: String}});

  const allocRequest = {
    id: '/AllocRequest',
    type: 'array',
    items: {
      oneOf: [
        {
          $ref: '/AllocRequestSchema'
        },
        {
          type: 'array', items: {$ref: '/AllocRequestSchema'}
        }
      ]
    }
  };

  const AllocRequestSchema = {
    id: '/AllocRequestSchema',
    type: 'object',
    properties: {
      type: {type: 'string'}
    }
  };
  v.addSchema(AllocRequestSchema, '/AllocRequest');

  schema.methods.release = function release(cb) {
    if (this.status.availability !== 'free') {
      this.status.availability = 'free';
      if (this.status.allocId) {
        this.status.allocId = undefined;
      }

      this.save(cb);
      logger.silly('release resource');
    } else {
      logger.silly('resource was already released');
      cb(null, this);
    }
  };

  schema.methods.allocate = function allocate(cb) {
    if (this.status.availability !== 'reserved') {
      this.status.availability = 'reserved';
      this.status.allocId = uuid.v1();

      this.save(cb);
      logger.silly('resource allocated :)');
    } else {
      cb({error: 'resource already allocated for somebody else'});
    }
  };

  schema.statics.releaseResources = function releaseResources(pAllocId, cb) {
    Resource.find({'status.allocId': pAllocId}, (pError, pDocs) => { // eslint-disable-line no-undef
      if (pError) {
        return cb(pError);
      }

      const release = (doc, relCb) => { doc.release(relCb); };
      return async.map(pDocs, release, cb);
    });
  };

  schema.statics.allocateResources = function allocateReources(pAllocRequest, cb) {
    const self = this;

    function allocateResource(request, pAllocCb) {
      function createQueryObject(queryCb) {
        const query = {
          'status.value': 'active',
          'status.availability': 'free'
        };

        if (Array.isArray(request)) {
          _.extend(query, {$or: request});
        } else {
          _.extend(query, request);
        }
        queryCb(query);
      }

      function reserve(pResource) {
        pResource.allocate(pAllocCb);
      }

      createQueryObject((q) => {
        logger.silly(`search: ${JSON.stringify(q)}`);
        self.find(q, (pError, results) => {
          if (pError) {
            logger.warn(`error: ${pError}`);
            pAllocCb(pError);
          } else if (results && results.length > 0) {
            reserve(results[0]);
          } else {
            logger.silly('not found');
            pAllocCb({
              request,
              error: 'cannot locate required resources'
            });
          }
        });
      });
    }

    logger.debug(`allocateReources: ${JSON.stringify(pAllocRequest)}`);
    const result = v.validate(pAllocRequest, allocRequest);
    if (result.errors.length === 0) {
      async.map(pAllocRequest, allocateResource, cb);
    } else {
      cb(result);
    }
  };
  logger.silly('ResourceAllocator registered to model');
}

module.exports = ResourceAllocator;
