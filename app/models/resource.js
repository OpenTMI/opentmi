
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
var ResourceAllocationPlugin = require('./plugins/resource-allocator');
/**
 * User schema
 */

var ResourceSchema = new Schema({
  name: {type: String, unique: true, required: true}, // Resource Name (more like nickname)
  type: {type: String, required: true, enum: [        // Resource type
        'system', 
        'dut', 
        'sim', 
        'instrument',
        'accessorie', 
        'computer', 
        'room', 
        'daemon'
      ]},
  status: { 
    value: { type: String, enum: [
      "active", 
      "maintenance", 
      "storage", 
      "broken"], 
      default: "active"}, 
    availability: {type: String, enum: ['free', 'reserved']},
    installed: {
      os: {
        name: {type: String},
        id: {type: ObjectId, ref: 'Build'}
      }
    },
    time: {type: Date, default: Date.now } 
  },
  cre: {
      user: {type: String, default: ""},              // Resource creator
      time: { type: Date, default: Date.now },   // Create timestamp
  },
  mod: {
      user: {type: String, default: ""},              // Resource modifier
      timestamp: { type: Date, default: Date.now },   // Modify timestamp
  },
  ownership: {
      corporation: {type: String},
      unit: {type: String},
      division: {type: String},
      department: {type: String},
      cost_center: { type: String},
      author: { type: String},
      purchased: {
          timestamp: { type: Date},
          user: { type: String},
      },
  },
  user_info: {
      corporation: {type: String},
      unit: {type: String},
      division: {type: String},
      department: {type: String},
      author: { type: String},
      cost_center: { type: String},
  },
  usage: {
    type: {type: String, enum: [
      'automation', 
      'shared', 
      'manual', 
      'unknown'], 
      default: 'unknown' },
    group: {type: String, enum: [
      'global', 
      'department', 
      'unknown'], 
      default: 'unknown' },
    automation: {
      system: {type: String, enum: ['default']},
    }
  },
  //resource details - target details
  target: {type: ObjectId, ref: 'Target'},  
  ip: {
    hostname: {type: String, unique: true, sparse: true},
    domain: {type: String},
    lan: [new Schema({
      name: {type: String, enum: ['', 'private'], default: 'rmad' }, // rmad if connected rmad
      dhcp: {type: Boolean, default: true},
      ipv4: {type: String}, //IPv4 address
      ipv4netmask: {type: String },
      ipv6: {type: String}, //IPv6 address
      mac: {type: String},
    })],
    remote_connection: {
      type: {type: String, enum:['', 'vnc','http','ssh','telnet','rdm'], default: ''},
      url: {type: String}, //if dedicated
      authentication: { username: {type: String}, password: {type: String}},
    }
  },
  other_info: {
    nickname: [ {type: String} ],   // resource nickname
    location: {                     // Resource physical location
      site: { type: String, default: 'unknown'},      // Site    
      country: { type: String },      // Country
      city: { type: String },         // City
      adddress: { type: String },     // Street address
      postcode: { type: String },     // Postcode
      room: { type: String, default: 'unknown'},      // Room
      subRoom: { type: String },      // subRoom
      geo: {type: [Number], index: '2d'},
    },
    identification: {
      sn: { type: String },
    }
  },
  /*
  configurations: {  
    defaults: {
      testcases: {
        path: [{type: String}]
      },
      logs: {
        path: [{type: String}]
      }
    }
  },
  shield: {
      rf: { type: Boolean }, // RF shield rack
  },
  app: [{
      
      type: {type: String, enum: ['application', 'plugin','library']},  // optional
      plugin: { 
          application: {type: String}
      },  
      library:{
          application: {type: String}
      },
      version: {type: String},
      href: {type: String},     // http url to file
      uuid: {type: String}      // or uuid to file
  }]
  events: [ResourceEventSchema],      //Events
  change_history: []
  */

  // Child resources
  childs: [ {type: ObjectId, ref: 'Resource'} ],
  // Parent Resource
  parent: {type: ObjectId, ref: 'Resource'}
});

ResourceSchema.set('toJSON', { 
  virtuals: true,
  getters: true, 
  minimize: true,
  transform: function(doc, ret, options) {
    if(!ret.id)ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if( ret.ip && 
        ret.ip.remote_connection &&
        ret.ip.remote_connection.authentication )
      delete ret.ip.remote_connection.authentication;
    return ret;
  }
});

/** install Plugins */
ResourceSchema.plugin( QueryPlugin );
ResourceSchema.plugin( ResourceAllocationPlugin );

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

ResourceSchema.method({
  // find route from this resource to HEAD
  solveRoute: function (cb) {
    var route = []
    var Resource = mongoose.model('Resource');
    var loop = function(error, resource){
      if( resource && resource.parent ) {
        route.push(resource.parent);
        Resource.find( {_id: resource.parent}, loop);
      } else {
        cb(error, route);
      } 
    }
    loop(null, this);
  },
  setDeviceBuild: function(build){
    this.device.build = build;
    this.save();
    console.log('new build in resource');
  },
});

/**
 * Statics
 */

ResourceSchema.static({
});

/**
 * Register
 */
mongoose.model('Resource', ResourceSchema);
