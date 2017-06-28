var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;

var logger = require('winston');
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

/**
 * Pre-save hooks
 */
// Make sure loaner is a user
LoanSchema.pre('save', function(next) {
  logger.info('Loan first pre-save hook started');
  var User = mongoose.model('User');
  User.findById(this.loaner, function(err, user) {
	if (err) next(new Error('Error while trying to find user, save interrupted'));
	else if (typeof user === 'undefined') next(new Error('Could not find user, save interrupted'));
	else next();
  });
});

// Takes care of decreasing availability of items before loaning
LoanSchema.pre('save', function(next) {
  logger.info('Loan second pre-save hook started');
  var self = this;
  if (!this.isNew) return next();
  
  var item_counts = self.extractItemIds();
  if (item_counts.length === 0)
    return next(new Error('cannot process post without items field'));
  
  self.ensureAvailability(item_counts, function(err) {
	if (err) return next(err);
	
	// Errors after this point could corrupt item.available value 
	self.pushIdsToItemsArray();
	self.modifyAvailability(item_counts, next);
  });
});

/**
 * Pre-remove hook
 */
LoanSchema.pre('remove', function(next) {
  logger.info('Loan pre-remove hook started');
  var self = this;
  
  var unreturned = self.countUnreturnedItems();
  self.modifyAvailability(unreturned, next);
});

/**
 * Methods
 */
LoanSchema.methods.extractItemIds = function() {
  var self = this;
  
  // Get item counts 
  var counts = {};
  for (var i = 0; i < this.items.length; i++) {
	counts[this.items[i].item] = typeof counts[this.items[i].item] === 'undefined' ?
	  -1 :
	  counts[this.items[i].item] - 1;
  }
  
  // Convert counts to array of objects
  return objectToArrayOfObjects(counts);
};
LoanSchema.methods.ensureAvailability = function(item_counts, next) {  
  logger.info('Ensuring item availablities');
  
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
  logger.info('Preparing to modify availability...');
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
	} else return new Error(`Id:${delta_items[i]._id} was not found in items`);
  }
  
  // Convert counts to array of objects
  var array_counts = [];
  for (var key in counts) {
	array_counts.push({id:key, index:counts[key].index, date:counts[key].date, count:counts[key].count});
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
LoanSchema.methods.countUnreturnedItems = function() {
  var self = this;
  var counts = {};
  //console.log(self.items);
  for (var i = 0; i < self.items.length; i++) {
	// Skip if return date has been defined
    if (typeof self.items[i].return_date !== 'undefined') continue;

	// Increase count by one 
	counts[self.items[i].item] = (typeof counts[self.items[i].item] === 'undefined') ?
	  1 :
      counts[self.items[i].item] + 1;
  }
  
  // Return as array of objects
  return objectToArrayOfObjects(counts);
}

/**
 * Private methods
 */
// Should be executed before actually attempting to decrease availability
function ensureItemAvailability(item_count_obj, next) {
  Item.findById(item_count_obj.id, function(err, item) {
    if (err) return next(new Error('Error while finding a provided item, item: ' + item_count_obj.id)); 
	if (item === null) return next(new Error('Could not find item, item: ' + item_count_obj.id)); 
	
	if (item.available + item_count_obj.count >= 0) 
	  next();
	else 
	  return next(new Error('Not enough items to loan, expected ' + item_count_obj.count + ' found ' + item.available));  
  });
}

// modify availability of an item
function modifyItemAvailability(item_count_obj, next) {
  logger.info('modifying item: ' + item_count_obj.id + ' by ' + item_count_obj.count);
  Item.findById(item_count_obj.id, function(err, item) {
	if (err) return next(new Error('Error while finding a provided item, item:' + item_count_obj.id + ' is very likely now corrupted')); // Should not happen
	if (item === null) return next(new Error('Could not find item, item:' + item_count_obj.id + ' is very likely now corrupted')); // Should not happen either
	
	item.available += item_count_obj.count;
	item.save(function(err) {
	  if (err) next(new Error('Could not save availability, item:' + item._id + ' is very likely now corrupted'));
	  else next();
    });
  });
}

function objectToArrayOfObjects(obj) {
  var count_array = [];
  for (var i in obj) {
	count_array.push({ id:i, count:obj[i] });
  }
  return count_array;
}

// Makes sure the provided date is valid
function isValidDate(date) {
 return date !== "Invalid Date" && !isNaN(date);
}

mongoose.model("Loan", LoanSchema);
