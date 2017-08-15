/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');

const Schema = mongoose.Schema;

/**
 * Resource Model schema
 */

const ResourceModelSchema = new Schema({
  name: {type: String, unique: true},
  manufacturer: {type: String},
  model: {type: String, default: 'unknown'},
  type: {type: String, enum: ['', 'other', 'R&D', 'CT', 'OperatorAcceptance']},
  description: {type: String},
  hw: {
    image_src: {type: String}, // this is kind of duplicate with item Schema
    spec_src: {type: String},
    memory: {
      size: {type: Number},
      score: {type: Number}
    },
    cpu: {
      vendor: {type: String},
      model: {type: String},
      count: {type: Number},
      freq: {type: Number},
      score: {type: Number}
    },
    disk: {
      size: {type: Number},
      score: {type: Number}
    },
    system: {
      score: {type: Number}
    }
  }
  /*
    os: {
        type: {type: String, enum: ['win', 'linux', 'android', 'mbed', unknown']},          // optional
        architecture: {type: String, enum: ['32', '64', 'unknown']}, // e.g. 32 / 64 / unknown
        version: {type: String},      // Windows 7 Service Pack 1 32-bit
    },
    specifications :{
        system_unit:  {type: String, enum: ['SI', 'BIS'], default: 'SI'}, // SI-system-unit or British Imperial System
        electrical: {
            acceptable_input_voltage: {
                min: { type: Number },
                max: { type: Number },
            },  //Volts
            power: { //Watts
                standby: {type: Number},
                max: {type: Number},
            },
            current: {
                max: { type: Number },              //Ampere
            }
        },
        physical: {
            size: {
                height: {type: Number},
                width:  {type: Number},
                depth:  {type: Number},
            },
            weight:  {type: Number},
            shipping_weight: {type: Number},
        },
        approvals: {
        },
        environmental: {
            temperature: {
                operating: {
                    min: {type: Number},
                    max: {type: Number},
                },
                storage: {
                    min: {type: Number},
                    max: {type: Number},
                }
            },
            humidity: {
                operating: {
                    min: {type: Number},
                    max: {type: Number},
                },
                storage: {
                    min: {type: Number},
                    max: {type: Number},
                }
            }
        },
        calibration: {
            intervall: { type: Number },
        },
    },
  }
  */
},
{toObject: {virtuals: true}});

/** install QueryPlugin */
ResourceModelSchema.plugin(QueryPlugin);

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
// TargetSchema.method({});

/**
 * Methods
 */


/**
 * Statics
 */

// TargetSchema.static({ });

/**
 * Register
 */
const ResourceModel = mongoose.model('ResourceModels', ResourceModelSchema);
module.exports = {Model: ResourceModel, Collection: 'Target'};
