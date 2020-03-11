const Validator = require('jsonschema').Validator;
const async = require('async');
const _ = require('lodash');
const uuid = require('uuid');
const logger = require('winston');

/**
 * @method ResourceAllocator
 * @param {mongoose.Schema} schema
 * @param {Object}          options
 * @param {Function}        [options.fn=Math.random]
 * @param {String}          [options.path='random']
 */
function ResourceAllocator(schema, options) { // eslint-disable-line no-unused-vars
  const editedSchema = schema;
  const v = new Validator();

  editedSchema.add({'status.allocId': {type: String}});

  const validAllocRequest = {
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

  editedSchema.methods.release = function release(next) {
    if (this.status.availability !== 'free') {
      this.status.availability = 'free';
      if (this.status.allocId) {
        this.status.allocId = undefined;
      }

      this.save(next);
      logger.silly('release resource');
    } else {
      logger.silly('resource was already released');
      next(null, this);
    }
  };

  editedSchema.methods.allocate = function allocate(next) {
    if (this.status.availability !== 'reserved') {
      this.status.availability = 'reserved';
      this.status.allocId = uuid();

      this.save(next);
      logger.silly('resource allocated :)');
    } else {
      next({error: 'resource already allocated for somebody else'});
    }
  };

  editedSchema.statics.releaseResources = function releaseResources(allocId, next) {
    Resource.find({'status.allocId': allocId}, (error, docs) => { // eslint-disable-line no-undef
      if (error) {
        return next(error);
      }

      const release = (doc, releaseNext) => { doc.release(releaseNext); };
      return async.map(docs, release, next);
    });
  };

  editedSchema.statics.allocateResources = function allocateResources(allocRequest, next) {
    const self = this;

    function allocateResource(request, allocNext) {
      function createQueryObject(queryNext) {
        const query = {
          'status.value': 'active',
          'status.availability': 'free'
        };

        if (Array.isArray(request)) {
          _.extend(query, {$or: request});
        } else {
          _.extend(query, request);
        }
        queryNext(query);
      }

      function reserve(resource) {
        resource.allocate(allocNext);
      }

      createQueryObject((q) => {
        logger.silly(`search: ${JSON.stringify(q)}`);
        self.find(q, (error, results) => {
          if (error) {
            logger.warn(`error: ${error}`);
            allocNext(error);
          } else if (results && results.length > 0) {
            reserve(results[0]);
          } else {
            logger.silly('not found');
            allocNext({
              request,
              error: 'cannot locate required resources'
            });
          }
        });
      });
    }

    logger.debug(`allocateResources: ${JSON.stringify(allocRequest)}`);
    const result = v.validate(allocRequest, validAllocRequest);
    if (result.errors.length === 0) {
      async.map(allocRequest, allocateResource, next);
    } else {
      next(result);
    }
  };
}

module.exports = ResourceAllocator;
