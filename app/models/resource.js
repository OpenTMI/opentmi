
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');
/**
 * User schema
 */

var ResourceSchema = new Schema({
  type: {type: String, required: true,                // Resource type
      enum: ['system', 'dut', 'sim', 'instrument','accessorie', 'computer', 'room']},   
  name: {type: String, unique: true, required: true}, // Resource Name (more like nickname)
  status: { 
    value: { type: String, enum: ["active", "maintenance", "storage", "broken"], default: "active"}, 
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
  usage: {
    type: {type: String, enum: ['automation', 'shared', 'manual', 'unknown'], default: 'unknown' },
    group: {type: String, enum: ['global', 'department', 'unknown'], default: 'unknown' },
    automation: {
      system: {type: String, enum: ['default']},
    }
  },
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
      },
      automation: {
        connected_slot: {type: Number}, //UE
        slots: [{                                               //Slots, if it's HW integrated to accessorie
          slot: {type: Number, required: true},               //Slot number (1-8)
          used: {type: Boolean, default: true},               //If slot is in use
        }],
      }
    },
   */    
    device: {
        manufacturer: { type: String},
        model: { type: String, default: 'unknown'},
        type: { type: String,  enum: ['', 'other', 'R&D', 'CT', 'OperatorAcceptance']},
        sn: { type: String, default: '', index: true, unique: true},  // ue PSN
        imei:{type: String, match: [/[\d]{15}/, 'Invalid IMEI ({VALUE})']},
        description: { type: String},
        hwid:{type: String},
        build: {type: String},
    },
    /*shield: {
        rf: { type: Boolean }, // RF shield rack
    },
    events: [ResourceEventSchema],      //Events
    ue: {
        components: [{
            type: {type: String, required: true, enum: ['wlan', 'bluetooth', 'modem']},
            sn: {type: String}, 
            mac: {type: String},
        }],
    },*/
    platform: {
      hw: {
        memory: {
          total: {type: Number},
          score: {type: Number},
        },
        cpu: {
          vendor: {type: String}, 
          model:  {type: String},
          count: {type: Number},
          freq:   {type: Number},
          score: {type: Number},
        },
        disk: {
          score: {type: Number},
        },
        system: {
          score: {type: Number},
        },
        components:[{
          
        }]
      },
      os: {
          type: {type: String, enum: ['win', 'linux', 'android', 'unknown']},          // optional
          architecture: {type: String, enum: ['32', '64', 'unknown']}, // e.g. 32 / 64 / unknown
          version: {type: String},      // Windows 7 Service Pack 1 32-bit
      },/*
      app: [{
          
          type: {type: String, enum: ['application', 'plugin','library']},  // optional
          plugin: { 
              application: {type: String}
          },  
          library:{
              application: {type: String}
          },
          version: {type: String},
          href: {type: String},                                              // http url to file
          uuid: {type: String}                                               // or uuid to file
      }]*/
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
    //user_history: []
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
    
    // Linked resources
    SubResources: [ {type: String} ],    // Attached sub resources uuid list
    partOf: {type: String, default: ""}              // part of other Resource
}, {toObject: { virtuals: true }

});

/**
 * User plugin
 */

//ResourceSchema.plugin(userPlugin, {});

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

});

/**
 * Statics
 */

ResourceSchema.static({

});

/**
 * Register
 */
ResourceSchema.plugin( QueryPlugin ); //install QueryPlugin
mongoose.model('Resource', ResourceSchema);
