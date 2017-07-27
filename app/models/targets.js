/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
// var userPlugin = require('mongoose-user');
const Schema = mongoose.Schema;
const _ = require('lodash');

const QueryPlugin = require('mongoose-query');
/**
 * User schema
 */

const TargetSchema = new Schema({
  name: {type: String, unique: true},
  yotta: [{
    target: {type: String, required: true},
    toolchain: {type: String, required: true}
  }],
  binary: {
    type: {type: String, required: true}
  },
  flash: {
    method: {type: String, required: true},
    cycle_s: {type: Number, required: true, min: 0, max: 100}
  },
  reset: {
    method: {type: String, required: true}
  },
  meta_info: {
    manufacturer: {type: String},
    model: {type: String, default: 'unknown'},
    type: {type: String, enum: ['', 'other', 'R&D', 'CT', 'OperatorAcceptance']},
    description: {type: String},
    components: [{
      type: {type: String, required: true, enum: ['wlan', 'bluetooth', 'modem']},
      sn: {type: String},
      mac: {type: String}
    }],
    hw: {
      picture: {type: String}, // link
      sn: {type: String, index: true}, // ue PSN
      imei: {type: String, match: [/[\d]{15}/, 'Invalid IMEI ({VALUE})']},
      hwid: {type: String},
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
      }/*
      disk: {
        score: {type: Number},
      },
      system: {
        score: {type: Number},
      },
      components:[{

      }] */
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
    }, */
  }
},
{toObject: {virtuals: true}});

/** install QueryPlugin */
TargetSchema.plugin(QueryPlugin);

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
TargetSchema.method({
  toGt() {
    const gtFormat = {
      yotta_targets: [],
      properties: {
        binary_type: this.binary.type,
        copy_method: this.flash.method,
        reset_method: this.reset.method,
        program_cycle_s: this.flash.cycle_s
      }
    };
    _.each(this.yotta, (yt) => {
      gtFormat.yotta_targets.push({
        yotta_target: yt.target,
        mbed_toolchain: yt.toolchain
      });
    });
    return gtFormat;
  }
});

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
const Target = mongoose.model('Target', TargetSchema);
module.exports = {Model: Target, Collection: 'Target'};
