const manageVersion = function (schema) {
  // Any middlewares that needs to be fired off for all
  // save queries
  schema.pre('save', function preSave(next) {
    this.increment();
    next();
  });
};

module.exports = {manageVersion};
