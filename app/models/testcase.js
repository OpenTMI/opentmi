
/*!
 * Module dependencies
 */

 /* node.js modules */

/* 3rd party libraries */
var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');

/* Implementation */   
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;
var Mixed = Types.Mixed;


var FileSchema = new Schema({
  filename: {type: String},
  ref: {type: String},
  size: {type: Number}
});
var FeatureSchema = new Schema({
  name: {type: String},
  SubFeas: [Mixed]
});
var ComponentSchema = new Schema({
  name: {type: String, required: true},
  supported_versions: {
    type: String, 
    match: /[*\d]{1,}\.?[*\d]{1,}?\.?[*\d]{1,}?/,
    default: "*"
  },
  features: [FeatureSchema]    
});
/**
 * Testcase schema
 */ 

var TestCaseSchema = new Schema({
  tcid: {
    type: String,     
    minlength: 4, 
    required: true, 
    index: true, 
    title: 'TC ID'
  },
  archive: {
    value: {type: Boolean, default: false,  //true when tc is archived
            title: 'Archived'},             
    time: {type: Date},                //timestamp when tc is archived
    user: {type: String},                   //username who archive this case
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
    name: {type: String, default: "", title: 'User' },
    group: {type: String, default: "", title: 'Group' },
    site: {type: String, title: 'Site'  }
  },
  other_info: {
    title: {type: String, default:  "", title: 'Title' },
    type: {type: String, enum: [
        "installation",
        "compatibility",
        "smoke",
        "regression",
        "acceptance",
        "alpha",
        "beta",
        "stability",
        "functional",
        "destructive",
        "performance",
        "reliability"
    ]},
    purpose: {type: String, title: 'Purpose' },               
    description: {type: String, title: 'Description' },   //Short description
    layer: {type: String, 
      enum: [ 'L1', 'L2', 'L3', 'unknown'],
      defaut: 'unknown', title: 'Layer'},
    sut: [ ComponentSchema ],
    components: [{type: String, title: 'Component'}],
    features: [{type: String, title: 'Feature'}],
    keywords: [ {type: String, title: 'Keyword'} ],
    tags: [{
      key: {type: String, required: true, title: 'Key'},
      value: {type: String, title: 'Value'}
    }],
    comments: [{
      comment: {type: String, title: 'Comment'},
      timestamp: {type: Date, default: Date.now},
      user: {type: String},
    }]
  },
  execution: {
    skip: {
      value: {type: Boolean, default: false, index: true}, 
      reason: { type: String },
      time: {type: Date}
    },
    estimation: {
      duration: {type: Number, default: 0},
      passrate: {type: Number, default: 0},
    },
    note: {type: String }, //execution notes (e.g. when manual configurations needed)
  },
  requirements: {
    node: {
      count: {type: Number, default: 1},
    }
  },
  files: [ FileSchema ],
  specification: {
    inline: {type: String, default: ""},  //inline specs
    href: {type: String },              //or external
  },
  status: {     //Current status
    value: { type: String, default: "unknown", 
      enum: [ 'unknown', 'released', 'development', 'maintenance', 'broken' ], 
      index: true, title: 'Status' 
    },
    verification: {  //verification details, if any
      value: {type: Boolean },
      user: {type: String},
      time: {type: Date},
      ss_resource: {type: String},
      dut_resource: {type: String},
      dut_build: {type: String},
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
        { type: String, enum: [ "K64F" ] } 
      ]
    },
    automation: {
      yes: {type: Boolean, default: false, index: true},
      system: {type: String},
    },
    field: {
      yes: {type: Boolean, default: false},
    }
  },

  ver: {
    cur: {type: Number, default: 0 },
    prev: {type: ObjectId, ref: 'Testcase'},
    next: {type: ObjectId, ref: 'Testcase'}
  }
});


TestCaseSchema.set('toJSON', { 
  virtuals: true,
  getters: true, 
  minimize: true,
  transform: function(doc, ret, options) {
    if(!ret.id)ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

TestCaseSchema.index({ tcid: 1, 'ver.cur': -1 }, {unique: true});

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
  updateDuration: function(duration){
    this.execution.estimation.duration += duration;
    this.execution.estimation.duration /= 2;
    this.save();
    console.log('saved new duration');
  },
  isLatest: function(){
    return( !this.ver.next );
  },
  getPrev: function(cb){
    if( this.ver.prev ){
      this.populate(this.ver.prev).exec(cb);
    } else {
      cb("no previous version")
    }
  }
});

/**
 * Statics
 */

TestCaseSchema.static({
  findByTcid: function (tcid, cb) {
    return this.findOne({ tcid: new RegExp(tcid, 'i') }, cb);
  },
  updateTcDuration: function(tcid, duration){
    this.findByTcid(tcid, function(error, tc){
      if( error ){
        console.log(error);
      } else if( tc ){
        console.log('find tc: '+tcid);
        tc.updateDuration(duration);
      } else {
        console.log('didnt find tc: '+tcid);
      }
    });
  },
  getDurationAverage: function(tcid, cb){
    var Result = mongoose.model("Result");
    Result.getDuration(tcid, cb);
  }
});

/**
 * Register
 */
TestCaseSchema.plugin( QueryPlugin ); //install QueryPlugin

var Testcase = mongoose.model('Testcase', TestCaseSchema);
// TODO figure out how to synchronously ensureIndexes so we do not close db connection before the process is completed
//Testcase.ensureIndexes(function (err) {
//  if (err) return handleError(err);
//});
