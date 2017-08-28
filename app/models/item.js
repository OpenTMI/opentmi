const mongoose = require('mongoose');
const logger = require('../tools/logger');
const QueryPlugin = require('mongoose-query');
const Request = require('request');

const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;
const request = Request.defaults({encoding: null});


const ItemSchema = new Schema({
  barcode: {type: String, unique: true, sparse: true},
  name: {type: String, required: true, unique: true},
  image_src: {type: String},
  text_description: {type: String},
  external_reference: {type: String},
  in_stock: {type: Number, required: true, default: 0, min: 0}, // total amount of SKUs
  available: {type: Number, required: true, default: 0, min: 0}, // in_stock - loaned
  unique_resources: [{type: ObjectId, ref: 'Resource'}],
  date_created: {type: Date},
  category: {
    type: String,
    required: true,
    enum: [
      'accessory',
      'board',
      'component',
      'other'],
    default: 'other'
  },

  manufacturer: {
    name: {type: String},
    url: {type: String}
  },
  testing_type: { // @todo perhaps better key for this ?
    type: String,
    enum: [
      '',
      'R&D',
      'ConformanceTest',
      'OperatorAcceptance',
      'other'
    ]
  },
  description: {type: String},
  specification_src: {type: String},
  hw: {
    model: {type: String},
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
  },
  os: {
    compatible: {
      type: String,
      enum: [
        'win',
        'linux',
        'android',
        'mbed',
        'unknown'
      ]
    },
    architecture: {
      name: {
        type: String,
        enum: [
          'ARM',
          'ARM64',
          'MSP430',
          '8051',
          'x86-32',
          'x86-64'
        ]
      },
      version: {type: String},
      implementation: {type: String}
    }
  },
  specifications: {
    system_unit: {
      type: String,
      enum: ['SI', 'BIS'] // SI-system-unit or British Imperial System
    },
    electrical: {
      acceptable_input_voltage: {
        min: {type: Number},
        max: {type: Number}
      }, // Volts
      power: { // Watts
        standby: {type: Number},
        max: {type: Number}
      },
      current: {
        max: {type: Number} // Ampere
      }
    },
    physical: {
      size: {
        height: {type: Number},
        width: {type: Number},
        depth: {type: Number}
      },
      weight: {type: Number},
      shipping_weight: {type: Number}
    },
    approvals: {
      // @todo
    },
    environmental: {
      temperature: {
        operating: {
          min: {type: Number},
          max: {type: Number}
        },
        storage: {
          min: {type: Number},
          max: {type: Number}
        }
      },
      humidity: {
        operating: {
          min: {type: Number},
          max: {type: Number}
        },
        storage: {
          min: {type: Number},
          max: {type: Number}
        }
      }
    },
    calibration: {
      interval: {type: Number},
      next: {type: Date}
    }
  }
});

/**
 * Query plugin
 */
ItemSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Pre-save hook
 */
ItemSchema.pre('save', function preSave(next) {
  logger.info('Item pre-save hook started');
  if (this.available > this.in_stock) {
    return next(new Error('availability cannot be higher than in_stock'));
  }

  return next();
});

/**
 * Pre-remove hook
 */
ItemSchema.pre('remove', function preRemove(next) {
  logger.info('Item pre-remove hook started');

  const self = this;
  const Loan = mongoose.model('Loan');

  Loan.find({}, (error, loans) => {
    if (error) return next(new Error('Something mysterious went wrong while fetching loans'));

    for (let i = 0; i < loans.length; i += 1) {
      for (let j = 0; j < loans[i].items.length; j += 1) {
        if (loans[i].items[j].item.toString() === self._id.toString()) {
          return next(new Error('Cannot delete this item, loans that refer to this item exist'));
        }
      }
    }
    return next();
  });
});

/**
 * Methods
 */
ItemSchema.methods.fetchImageData = function fetchImageData(next) {
  request.get(this.image_src, (error, res, body) => {
    if (error) return next(new Error('could not process image get request'));

    if (res.statusCode === 200) {
      const imageData = {
        type: res.headers['content-type'],
        data: body
      };
      next(imageData);
    } else {
      return next(new Error(`image get request returned with an unexpected code: ${res.statusCode}`));
    }

    return undefined;
  });
};

const Item = mongoose.model('Item', ItemSchema);
module.exports = {Model: Item, Collection: 'Item'};
