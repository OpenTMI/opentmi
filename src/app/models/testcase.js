
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

/**
 * User schema
 */

var TestCaseSchema = new Schema({
  tcid: {type: String, required: true, index: true, title: 'TC ID'},
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
    purpose: {type: String, title: 'Purpose' },               
    description: {type: String, title: 'Description' },   //Short description
    layer: {type: String, 
      enum: [ 'L1', 'L2', 'L3', 'unknown'],
      defaut: 'unknown', title: 'Layer'},
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
  specification: {
    inline: {type: String, default: ""},  //inline specs
    href: {type: String },              //or external
  },
  status: {     //Current status
    value: { type: String, default: "unknown", 
      enum: [ 'unknown', 'released', 'development', 'maintenance', 'broken' ], 
      index: true, title: 'Status' },
    verification: {  //verification details, if any
      value: {type: Boolean },
      user: {type: String},
      timestamp: {type: Date},
      ss_resource: {type: String},
      ue_resoruce: {type: String},
      ue_build: {type: String},
    }
  },
  history: {
    durationAvg: {type: Number, default: 60}
  },
  compatible: {
    automation: {
      yes: {type: Boolean, default: false, index: true},
      system: {type: String},
    },
    field: {
      yes: {type: Boolean, default: false},
    }
  },
  
  versions: {
    previous: {type: ObjectId},
    next: {type: ObjectId}
  }
});


TestCaseSchema.set('toJSON', { 
  virtuals: true,
  getters: true, 
  minimize: true,
  transform: function(doc, ret, options) {
    console.log('tojson...');
    if(!ret.id)ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});


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

});

/**
 * Statics
 */

TestCaseSchema.static({

});

/**
 * Register
 */
TestCaseSchema.plugin( QueryPlugin ); //install QueryPlugin
mongoose.model('Testcase', TestCaseSchema);
