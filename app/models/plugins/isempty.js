const logger = require('winston');

/**
 * @method isEmpty
 * @param {mongoose.Schema} pSchema
 * @param {Object}          pOptions
 * @param {Function}        [pOptions.fn=Math.random]
 * @param {String}          [pOptions.path='random']
 */
function IsEmpty(pSchema, pOptions) { // eslint-disable-line no-unused-vars
  const schema = pSchema;
  schema.statics.isEmpty = function isEmpty(cb) {
    this.count({}, (error, count) => {
      cb(error, count === 0);
    });
  };

  logger.info('isEmpty registered');
}

module.exports = IsEmpty;
