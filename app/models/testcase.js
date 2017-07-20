
/*!
 * Module dependencies
 */

/* node.js modules */

/* Third party libraries */
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const logger = require('winston');

/* Implementation */
const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;
const Mixed = Types.Mixed;


const FileSchema = new Schema({
  filename: {type: String},
  ref: {type: String},
  size: {type: Number}
});
const FeatureSchema = new Schema({
  name: {type: String},
  SubFeas: [Mixed]
});
const ComponentSchema = new Schema({
  name: {type: String, required: true},
  supported_versions: {
    type: String,
    match: /[*\d]{1,}\.?[*\d]{1,}?\.?[*\d]{1,}?/,
    default: '*'
  },
  features: [FeatureSchema]
});
/**
 * Testcase schema
 */

const TestCaseSchema = new Schema({
  tcid: {
    type: String,
    minlength: 4,
    required: true,
    index: true,
    title: 'TC ID'
  },
  archive: {
    value: {
      type: Boolean,
      default: false, // true when tc is archived
      title: 'Archived'
    },
    time: {type: Date}, // timestamp when tc is archived
    user: {type: String} // username who archive this case | should be reference to account?
  },
  cre: {
    time: {type: Date, default: Date.now},
    user: {type: String}
  },
  mod: {
    timestamp: {type: Date, default: Date.now},
    user: {type: String}
  },
  owner: {
    name: {type: String, default: '', title: 'User'},
    group: {type: String, default: '', title: 'Group'},
    site: {type: String, title: 'Site'}
  },
  other_info: {
    title: {type: String, default: '', title: 'Title'},
    type: {
      type: String,
      enum: [
        'installation',
        'compatibility',
        'smoke',
        'regression',
        'acceptance',
        'alpha',
        'beta',
        'stability',
        'functional',
        'destructive',
        'performance',
        'reliability'
      ]
    },
    purpose: {type: String, title: 'Purpose'},
    description: {type: String, title: 'Description'}, // Short description
    layer: {
      type: String,
      enum: ['L1', 'L2', 'L3', 'unknown'],
      default: 'unknown',
      title: 'Layer'},
    sut: [ComponentSchema],
    components: [{type: String, title: 'Component'}],
    features: [{type: String, title: 'Feature'}],
    keywords: [{type: String, title: 'Keyword'}],
    tags: [{
      key: {type: String, required: true, title: 'Key'},
      value: {type: String, title: 'Value'}
    }],
    comments: [{
      comment: {type: String, title: 'Comment'},
      timestamp: {type: Date, default: Date.now},
      user: {type: String}
    }]
  },
  execution: {
    skip: {
      value: {type: Boolean, default: false, index: true},
      reason: {type: String},
      time: {type: Date}
    },
    estimation: {
      duration: {type: Number, default: 0},
      passrate: {type: Number, default: 0}
    },
    note: {type: String} // execution notes (e.g. when manual configurations needed)
  },
  requirements: {
    node: {
      count: {type: Number, default: 1}
    }
  },
  files: [FileSchema],
  specification: {
    inline: {type: String, default: ''}, // inline specs
    href: {type: String} // or external
  },
  status: { // Current status
    value: {
      type: String,
      default: 'unknown',
      enum: ['unknown', 'released', 'development', 'maintenance', 'broken'],
      index: true,
      title: 'Status'
    },
    verification: { // verification details, if any
      value: {type: Boolean},
      user: {type: String},
      time: {type: Date},
      ss_resource: {type: String},
      dut_resource: {type: String},
      dut_build: {type: String}
    }
  },
  history: {
    durationAvg: {type: Number, default: 60}
  },
  compatible: {
    simulation: {
      yes: {type: Boolean, default: true}
    },
    hardware: {
      yes: {type: Boolean, default: true},
      target: [
        {type: String, enum: ['K64F']}
      ]
    },
    automation: {
      yes: {type: Boolean, default: false, index: true},
      system: {type: String}
    },
    field: {
      yes: {type: Boolean, default: false}
    }
  },

  ver: {
    cur: {type: Number, default: 0},
    prev: {type: ObjectId, ref: 'Testcase'},
    next: {type: ObjectId, ref: 'Testcase'}
  }
});


TestCaseSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  minimize: true,
  transform(pDoc, pRet) {
    const jsonResource = pRet;

    if (!jsonResource.id) {
      jsonResource.id = pRet._id;
    }

    delete jsonResource._id;
    delete jsonResource.__v;
    return jsonResource;
  }
});

TestCaseSchema.index({tcid: 1, 'ver.cur': -1}, {unique: true});

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

TestCaseSchema.method({
  updateDuration(pDuration) {
    this.execution.estimation.duration += pDuration;
    this.execution.estimation.duration /= 2;
    this.save();
    logger.info('saved new duration');
  },
  isLatest() {
    return (!this.ver.next);
  },
  getPrev(cb) {
    if (this.ver.prev) {
      this.populate(this.ver.prev).exec(cb);
    } else {
      cb('no previous version');
    }
  }
});

/**
 * Statics
 */

TestCaseSchema.static({
  findByTcid(pTestcaseId, cb) {
    return this.findOne({tcid: new RegExp(pTestcaseId, 'i')}, cb);
  },
  updateTcDuration(pTestcaseId, duration) {
    this.findByTcid(pTestcaseId, (pError, pTestcase) => {
      if (pError) {
        logger.warn(pError);
      } else if (pTestcase) {
        logger.info(`found tc: ${pTestcaseId}`);
        pTestcase.updateDuration(duration);
      } else {
        logger.warn(`did not find tc: ${pTestcaseId}`);
      }
    });
  },
  getDurationAverage(pTestcaseId, cb) {
    const Result = mongoose.model('Result');
    Result.getDuration(pTestcaseId, cb);
  }
});

/**
 * Register
 */
TestCaseSchema.plugin(QueryPlugin); // install QueryPlugin

const Testcase = mongoose.model('Testcase', TestCaseSchema);
module.exports = {Model: Testcase, Collection: 'Testcase'};
