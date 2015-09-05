
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');
var _ = require('underscore')
/**
 * User schema
 */

var CampaignSchema = new Schema({
  name: { type: String, required: true },
  enable: {
    value: {type: Boolean, default: true},
    user: {type: String},
    time: {type: Date}
  },
  cre: {
    user: {type: String},
    time: {type: Date, default: Date.now},
  },
  mod: {
    user: {type: String},
    time: {type: Date, default: Date.now},
  },
  auth: {
    author: {type: String},
    group: {
      name: {type: String},
      write: {type: Boolean, default: true},
      exe: {type: Boolean, default: true}
    },
    other: {
      write: {type: Boolean, default: false},
      exe: {type: Boolean, default: false}
    }
  },
  tcs: {type: String, default: ""},
});

/**
 * User plugin
 */
CampaignSchema.plugin( QueryPlugin ); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

CampaignSchema.method({
  findTestcases: function(query, cb) {
  
    if( !this.tcs ) {
      cb('test_cases field missing!');
      return;
    }
    if( this.tcs[0] == '{' ) {
      _.extend(query, {q: this.tcs});
    } else { 
      var parts = this.tcs.matches.split('&'), i;
      for(i=0;i<parts.length;i++){
        var x = parts[i].split('=');
        if( x.length == 2 ){
          var q = {};
          q[x[0]] = x[1];
          _.extend(query, q);
        }
      }
    }
    testcases = mongoose.model('Testcase')
    testcases.query( query, cb );
  }
});

/**
 * Statics
 */

CampaignSchema.static({

});

/**
 * Register
 */
mongoose.model('Campaign', CampaignSchema);
