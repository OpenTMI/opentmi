const manageVersion = function (schema) {
  // Any middlewares that needs to be fired off for all
  // save and update-type queries
  schema.pre('save', (next) => {
    this.increment();
    next();
  });
  schema.pre('update', (next) => {
    this.update({}, {$inc: {__v: 1}}, next);
  });
};

module.exports = {manageVersion};
