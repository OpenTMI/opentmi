function isEmpty(model, next) {
  const pending = model.estimatedDocumentCount({})
      .then(count => count === 0);
    return next ? pending
        .then(empty => next(undefined, empty)).catch(next)
      : pending;
}

/**
 * Extend model with isEmpty -function which resolves boolean if collection is empty
 * @method IsEmpty
 * @param {mongoose.Schema} schema
 * @param {Object}          options
 */
function IsEmpty(schema, options) { // eslint-disable-line no-unused-vars
  const editedSchema = schema;
  editedSchema.statics.isEmpty = function empty(next) {
    return isEmpty(this, next);
  };
}

module.exports = {IsEmpty, isEmpty};
