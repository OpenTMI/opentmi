
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;
var _ = require('underscore');

var QueryPlugin = require('mongoose-query');
/**
 * User schema
 */

var TargetSchema = new Schema({
  name: {type: String, unique: true},
  yotta: [{
    target: {type: String, required: true},
    toolchain: {type: String, required: true}
  }],
  binary: {
    type: {type: String, required: true},
  },
  flash: {
    method: {type: String, required: true},
    cycle_s: {type: Number, required: true, min: 0, max: 100}
  },
  reset: {
    method: {type: String, required: true}
  }
}, {toObject: { virtuals: true }
});


/** install QueryPlugin */
TargetSchema.plugin( QueryPlugin ); 

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
TargetSchema.method({
  toGt: function () {
    var gt_format = {
      yotta_targets: [],
      properties: {
        binary_type: this.binary.type,
        copy_method: this.flash.method,
        reset_method: this.reset.method,
        program_cycle_s: this.flash.cycle_s
      }
    }
    _.each(this.yotta, function(yt){
      gt_format.yotta_targets.push({
        yotta_target: yt.target,
        mbed_toolchain: yt.toolchain
      })
    })
    return gt_format;
  }
});

/**
 * Methods
 */


/**
 * Statics
 */

TargetSchema.static({
});

/**
 * Register
 */
mongoose.model('Target', TargetSchema);
