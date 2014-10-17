
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

var CampaignSchema = new Schema({
  name: { type: String, required: true },
  users: [ { type: String } ],
  tc: {type: String}
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
