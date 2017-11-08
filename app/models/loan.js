const mongoose = require('mongoose');
const async = require('async');
const QueryPlugin = require('mongoose-query');
const logger = require('../tools/logger');

const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;
const Item = mongoose.model('Item');

/**
 * Private methods
 */
// Should be executed before actually attempting to decrease availability
function ensureItemAvailability(itemCountObj, next) {
  Item.findById(itemCountObj.id, (error, item) => {
    if (error) {
      return next(new Error(`Error while finding a provided item, item: ${itemCountObj.id}`));
    }

    if (item === null) {
      return next(new Error(`Could not find item, item: ${itemCountObj.id}`));
    }

    if (item.available + itemCountObj.count >= 0) {
      return next();
    }

    return next(new Error(`Not enough items to loan, expected ${itemCountObj.count}, found ${item.available}`));
  });
}

// modify availability of an item
function modifyItemAvailability(itemCountObj, next) {
  logger.info(`modifying item: ${itemCountObj.id} by ${itemCountObj.count}`);
  Item.findById(itemCountObj.id, (error, item) => {
    if (error || item === null) {
      return next(new Error('Error while finding a provided item, '
      + `item: ${itemCountObj.id} is very likely now corrupted`)); // Should not happen
    }

    item.available += itemCountObj.count; // eslint-disable-line no-param-reassign
    return item.save((saveError) => {
      if (saveError) next(new Error(`Could not save item: ${item._id} availability, error: ${saveError.message}`));
      else next();
    });
  });
}

function objectToArrayOfObjects(obj) {
  const countArray = [];

  Object.keys(obj).forEach((key) => {
    countArray.push({id: key, count: obj[key]});
  });

  return countArray;
}

// Makes sure the provided date is valid
function isValidDate(date) {
  return date !== 'Invalid Date' && !isNaN(date);
}


const LoanItemSchema = new Schema({
  item: {type: ObjectId, ref: 'Item', required: true},
  return_date: {
    type: Date,
    validate: {
      validator: isValidDate,
      message: '{VALUE} cannot be parsed to a date.'
    }},
  resource: {type: ObjectId, ref: 'Resource'}
});

const LoanSchema = new Schema({
  loan_date: {type: Date, required: true, default: Date.now},
  loaner: {type: ObjectId, ref: 'User', required: true},
  notes: {type: String},
  items: [LoanItemSchema]
});

/**
 * Query plugin
 */
LoanSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Pre-save hooks
 */
// Make sure loaner is a user
LoanSchema.pre('save', function preSave(next) {
  logger.info('Loan first pre-save hook started');
  const User = mongoose.model('User');
  User.findById(this.loaner, (err, user) => {
    if (err) {
      next(new Error('Error while trying to find user, save interrupted'));
    } else if (typeof user === 'undefined') {
      next(new Error('Could not find user, save interrupted'));
    } else {
      next();
    }
  });
});

// Make sure version number is incremented every time when saving document
LoanSchema.pre('save', function preSave(next) {
  this.increment();
  next();
});

// Takes care of decreasing availability of items before loaning
LoanSchema.pre('save', function preSave(next) {
  logger.info('Loan second pre-save hook started');
  if (!this.isNew) return next();

  const itemIds = this.extractItemIds();
  if (itemIds.length === 0) {
    return next(new Error('cannot process post without items field'));
  }

  this.ensureAvailability(itemIds, (error) => {
    if (error) return next(error);

    // Errors after this point could corrupt item.available value
    this.pushIdsToItemsArray();
    this.modifyAvailability(itemIds, next);

    return undefined;
  });

  return undefined;
});

/**
 * Pre-remove hook
 */
LoanSchema.pre('remove', function preRemove(next) {
  logger.info('Loan pre-remove hook started');
  const unreturned = this.countUnreturnedItems();
  this.modifyAvailability(unreturned, next);
});

/**
 * Methods
 */
LoanSchema.methods.extractItemIds = function extractIds() {
  // Get item counts
  const counts = {};
  for (let i = 0; i < this.items.length; i += 1) {
    counts[this.items[i].item] = !counts[this.items[i].item] ?
      -1 : counts[this.items[i].item] - 1; // negative because we are
  }

  // Convert counts to array of objects
  return objectToArrayOfObjects(counts);
};
LoanSchema.methods.ensureAvailability = function ensureAvailability(itemCounts, next) {
  logger.info('Ensuring item availablities');

  // Ensure that there is enough items to loan
  async.eachSeries(itemCounts, ensureItemAvailability, (error) => {
    if (error) {
      return next(error);
    }

    return next();
  });
};

LoanSchema.methods.pushIdsToItemsArray = function pushIds() {
  // Make sure items array only contains relevant fields
  const self = this;

  const copyItems = self.items;
  self.items = [];

  for (let i = 0; i < copyItems.length; i += 1) {
    self.items.push({item: copyItems[i].item});
  }
};

LoanSchema.methods.modifyAvailability = function modifyAvailability(itemIds, next) {
  logger.info('Preparing to modify availability...');
  async.eachSeries(itemIds, modifyItemAvailability, next);
};

LoanSchema.methods.countReturns = function countReturns(deltaItems) {
  // console.log(JSON.stringify(delta_items) + ' ' + delta_items.length);
  const self = this;
  const counts = {};
  for (let i = 0; i < deltaItems.length; i += 1) {
    if (!deltaItems[i]._id) {
      return new Error('Encountered an item without _id');
    }
    const item = self.findWithIndex(deltaItems[i]._id);

    // Only continue if referenced item exists
    if (item) {
      if (typeof item.data.return_date === 'undefined' && typeof deltaItems[i].return_date !== 'undefined') {
        // We now know that the item did not have a return date and a new one is proposed
        if (!isValidDate(new Date(deltaItems[i].return_date))) {
          return Error('Received an invalid date');
        }

        // Valid item with valid date
        if (!(item.data.item in counts)) {
          // New item, push important info to array
          counts[item.data.item] = {index: item.index, date: deltaItems[i].return_date, count: 1};
        } else {
          // Item is already known
          counts[item.data.item].count += 1;
        }
      }
    } else {
      return new Error(`Id:${deltaItems[i]._id} was not found in items`);
    }
  }

  // Convert counts to array of objects
  const arrayCounts = [];
  Object.keys(counts).forEach((key) => {
    arrayCounts.push({
      id: key,
      index: counts[key].index,
      date: counts[key].date,
      count: counts[key].count});
  });

  return arrayCounts;
};

LoanSchema.methods.findWithIndex = function fintWithIndex(itemId) {
  for (let i = 0; i < this.items.length; i += 1) {
    if (this.items[i]._id.toString() === itemId.toString()) {
      return {index: i, data: this.items[i]};
    }
  }

  return null;
};

LoanSchema.methods.countUnreturnedItems = function countUnreturnedItems() {
  const self = this;
  const counts = {};

  for (let i = 0; i < self.items.length; i += 1) {
    // Skip if return date has been defined
    if (!self.items[i].return_date) {
      // Increase count by one
      counts[self.items[i].item] = !counts[self.items[i].item] ?
        1 : counts[self.items[i].item] + 1;
    }
  }

  // Return as array of objects
  return objectToArrayOfObjects(counts);
};

const Loan = mongoose.model('Loan', LoanSchema);
module.exports = {Model: Loan, Collection: 'Loan'};
