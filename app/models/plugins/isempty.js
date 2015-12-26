/**
 * @method isEmpty
 * @param {mongoose.Schema} schema
 * @param {Object}          options
 * @param {Function}        [options.fn=Math.random]
 * @param {String}          [options.path='random']
 */
var IsEmpty = function(schema, options){
  schema.statics.isEmpty = function(cb){
    this.count({}, function(error, count){
      cb(error, count===0);
    });
  }
  console.log("isEmpty registered");
}

module.exports = exports = IsEmpty;