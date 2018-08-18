const logger = require('../../tools/logger');

/**
 * @method isEmpty
 * @param {mongoose.Schema} schema
 * @param {Object}          options
 * @param {Function}        [options.fn=Math.random]
 * @param {String}          [options.path='random']
 */
function IsEmpty(schema, options) { // eslint-disable-line no-unused-vars
  const editedSchema = schema;
  editedSchema.statics.isEmpty = function isEmpty(next) {
    this.countDocuments({}, (error, count) => {
      next(error, count === 0);
    });
  };

  logger.info('isEmpty registered');
}

module.exports = IsEmpty;
