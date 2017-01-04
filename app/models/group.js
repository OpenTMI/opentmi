
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var _ = require('lodash');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');
/* Implementation */   
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;
var Mixed = Types.Mixed;
/**
 * Group schema
 */

var GroupSchema = new Schema({
  name: { type: String, required: true },
  users: [ { type: ObjectId, ref: 'User' } ],
  priority: {
    //max priority, 0=highest
    max: {type: Number, default: 3, min: 0, max: 5 },
  },                             
  description: {type: String },
});

/**
 * Group plugin
 */
GroupSchema.plugin( QueryPlugin ); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

GroupSchema.method({
  addUser: function(email, cb){
    var self = this;
    var User = mongoose.model('User');
    User.findOne({email: email}, function(error, user){
      if( error ){
        return cb(error);
      }
      if( !user ){
        return cb({message: 'user not found'});
      }
      if( user.groups.indexOf(self._id)>=0){
        console.log({message: 'group already exists'})
      } else {
        user.groups.push(self._id);
        user.save();  
      }
      if( self.users.indexOf(user._id)>=0){
        cb({message: 'user has already in group'})
      } else {
        self.users.push( user._id );
        self.save(cb);  
      }
    })
  },
  /*getUserGroups: function (user, cb) {
    return this.findOne({}, cb);
  },*/
});

/**
 * Statics
 */

GroupSchema.static({
  getUsers: function(group, cb){
    this.findOne({name: group}).select('users').populate('users').exec( 
      function(error, docs){
        if(error)return cb(error);
        if(docs) return cb(error, docs.users)
        cb(error, docs)
      }
    );
  }
});

/**
 * Register
 */
mongoose.model('Group', GroupSchema);
