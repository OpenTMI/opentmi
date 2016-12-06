var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;

var winston = require('winston');
var async = require('async');
var QueryPlugin = require('mongoose-query');

var Item = mongoose.model('Item');

var LoanItemSchema = new Schema({
  item        : { type:ObjectId, ref:'Item', required:true },
  return_date : { type:Date, validate: {
	                validator: isValidDate,
                    message: '{VALUE} cannot be parsed to a date.'
	              }},
  resource    : { type:ObjectId, ref:'Resource' } 	
});

var LoanSchema = new Schema({
  loan_date : { type:Date, required: true, default: Date.now },
  loaner    : { type:ObjectId, ref:'User', required:true },                  
  notes     : { type: String },
  items     : [ LoanItemSchema ]
});

/**
 * Query plugin
 */
LoanSchema.plugin( QueryPlugin ); //install QueryPlugin


// Make sure loaner is a user
LoanSchema.pre('save', function(next) {
  //console.log('User start...');
  var User = mongoose.model('User');
  User.findById(this.loaner, function(err, user) {
	if (err) next(new Error('Error while trying to find user, save interrupted'));
	else if (typeof user === 'undefined') next(new Error('Could not find user, save interrupted'));
	else next();
  });
});

// Takes care of decreasing availability of items before loaning
LoanSchema.pre('save', function(next) {
  //console.log('Save start...');
  var self = this;
  
  if (!this.isNew) return next();
  
  var item_counts = self.extractItemIds();
  self.ensureAvailability(item_counts, function(err) {
	if (err) return next(err);
	
	// Errors after this point could corrupt item.available value 
	self.pushIdsToItemsArray();
	//console.log('Save ended...');
	self.modifyAvailability(item_counts, next);
  });
});

LoanSchema.methods.extractItemIds = function() {
  // Get item counts 
  var counts = {};
  for (var i = 0; i < this.items.length; i++) {
	if (counts[this.items[i].item]) counts[this.items[i].item] += 1; //
	else counts[this.items[i].item] = 1;
  }
  
  // Convert counts to array of objects
  var array_counts = [];
  for (key in counts) {
	// Add negative counts because we want to decrease availability
	array_counts.push({item_id:key, count:-counts[key]}); 
  }
  
  return array_counts;
};
LoanSchema.methods.ensureAvailability = function(item_counts, next) {  
  winston.info('Ensuring item availablities');
  
  // Ensure that there is enough items to loan
  async.eachSeries(item_counts, ensureItemAvailability, function(err) {
	if (err) return next(err);
	else next();  	
  });
}
LoanSchema.methods.pushIdsToItemsArray = function(ids) {
  // Make sure items array only contains relevant fields
  var self = this;
  
  var copy_items = self.items;
  self.items = [];
  
  for (var i = 0; i < copy_items.length; i++) {
	self.items.push({item:copy_items[i].item});
  }
}
LoanSchema.methods.modifyAvailability = function(item_counts, next) {
  winston.info('Preparing to modify availability...');
  async.eachSeries(item_counts, modifyItemAvailability, next);
}
LoanSchema.methods.countReturns = function(delta_items) {
  //console.log(JSON.stringify(delta_items) + ' ' + delta_items.length);
  var self = this;
  var counts = {};
  for (var i = 0; i < delta_items.length; i++) {
	if (typeof delta_items[i]._id === 'undefined') {
	  return new Error('Encountered an item without _id');
	}
	var item = self.findWithIndex(delta_items[i]._id);
    if (item !== null) { // A pair for the element in the database was found if not null
	  //console.log('item_date' + item.data + (typeof item.data.return_date === 'undefined'));
	  if (typeof item.data.return_date === 'undefined' && typeof delta_items[i].return_date !== 'undefined') { 
		// We now know that the item did not have a return date and a new one is proposed
		if (!isValidDate(new Date(delta_items[i].return_date))) {
		  return Error('Received an invalid date');
		}
		  // Valid item with valid date
	    if (!(item.data.item in counts))
	      // New item, push important info to array
	      counts[item.data.item] = {index:item.index, date:delta_items[i].return_date, count:1 };
	    else {
		  // Item is already known
		  counts[item.data.item].count += 1;
		}
	  }
      //else console.log('No return_date');
      //else return new Error('No return date defined');
	}
	else return new Error('Received invalid id');
  }
  
  // Convert counts to array of objects
  var array_counts = [];
  for (key in counts) {
	array_counts.push({item_id:key, index:counts[key].index, date:counts[key].date, count:counts[key].count});
  }
  
  return array_counts;
}
LoanSchema.methods.findWithIndex = function(item_id) {
  for (var i = 0; i < this.items.length; i++) {
	if (this.items[i]._id.toString() === item_id.toString()) {
	  return {index:i, data:this.items[i]};
	}
  }
  //console.log('No matches');
  return null;
}

// Should be executed before actually attempting to decrease availability
function ensureItemAvailability(item_count_obj, next) {
  Item.findById(item_count_obj.item_id, function(err, item) {
    if (err) return next(new Error('Error while finding a provided item, item: ' + item_count_obj.item_id)); 
	if (item === null) return next(new Error('Could not find item, item: ' + item_count_obj.item_id)); 
	
	if (item.available + item_count_obj.count >= 0) 
	  next();
	else 
	  return next(new Error('Not enough items to loan, expected ' + item_count_obj.count + ' found ' + item.available));  
  });
}

// modify availability of an item
function modifyItemAvailability(item_count_obj, next) {
  winston.info('modifying item: ' + item_count_obj.item_id + ' by ' + item_count_obj.count);
  Item.findById(item_count_obj.item_id, function(err, item) {
	if (err) return next(new Error('Error while finding a provided item, item:' + keys[cur] + ' is very likely now corrupted')); // Should not happen
	if (item === null) return next(new Error('Could not find item, item:' + keys[cur] + ' is very likely now corrupted')); // Should not happen either
	//console.log('  Item found: ' + item.available);
	
	item.available += item_count_obj.count;
	item.save(function(err) {
	  //console.log('  Save complete');
	  if (err) next(new Error('Could not save availability, item:' + items[cur].item + ' is very likely now corrupted'));
	  else next();
    });
  });
}

// Makes sure the provided date is valid
function isValidDate(date) {
 return date !== "Invalid Date" && !isNaN(date);
}

mongoose.model("Loan", LoanSchema);
