const mongoose = require('mongoose');
const async = require('async');
const QueryPlugin = require('mongoose-query');
const logger = require('winston');

const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;
const Item = mongoose.model('Item');

/**
 * Private methods
 */
// Should be executed before actually attempting to decrease availability
function ensureItemAvailability(pItemCountObj, pNext) {
  Item.findById(pItemCountObj.id, (err, item) => {
    if (err) {
      return pNext(new Error(`Error while finding a provided item, item: ${pItemCountObj.id}`));
    }

    if (item === null) {
      return pNext(new Error(`Could not find item, item: ${pItemCountObj.id}`));
    }

    if (item.available + pItemCountObj.count >= 0) {
      return pNext();
    }

    return pNext(new Error(`Not enough items to loan, expected ${pItemCountObj.count}, found ${item.available}`));
  });
}

// modify availability of an item
function modifyItemAvailability(pItemCountObj, pNext) {
  logger.info(`modifying item: ${pItemCountObj.id} by ${pItemCountObj.count}`);
  Item.findById(pItemCountObj.id, (pError, pItem) => {
    if (pError || pItem === null) {
      return pNext(new Error('Error while finding a provided item, '
      + `item: ${pItemCountObj.id} is very likely now corrupted`)); // Should not happen
    }

    pItem.available += pItemCountObj.count; // eslint-disable-line no-param-reassign
    return pItem.save((pSaveError) => {
      if (pSaveError) pNext(new Error(`Could not save availability, item: ${pItem._id} is very likely now corrupted`));
      else pNext();
    });
  });
}

function objectToArrayOfObjects(pObj) {
  const countArray = [];

  Object.keys(pObj).forEach((key) => {
    countArray.push({id: key, count: pObj[key]});
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

// Takes care of decreasing availability of items before loaning
LoanSchema.pre('save', function preSave(pNext) {
  logger.info('Loan second pre-save hook started');
  const self = this;
  if (!this.isNew) return pNext();

  const itemCounts = self.extractItemIds();
  if (itemCounts.length === 0) {
    return pNext(new Error('cannot process post without items field'));
  }

  self.ensureAvailability(itemCounts, (pError) => {
    if (pError) return pNext(pError);

    // Errors after this point could corrupt item.available value
    self.pushIdsToItemsArray();
    self.modifyAvailability(itemCounts, pNext);

    return undefined;
  });

  return undefined;
});

/**
 * Pre-remove hook
 */
LoanSchema.pre('remove', function preRemove(pNext) {
  logger.info('Loan pre-remove hook started');
  const self = this;

  const unreturned = self.countUnreturnedItems();
  self.modifyAvailability(unreturned, pNext);
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
LoanSchema.methods.ensureAvailability = function ensureAvailability(pItemCounts, pNext) {
  logger.info('Ensuring item availablities');

  // Ensure that there is enough items to loan
  async.eachSeries(pItemCounts, ensureItemAvailability, (pError) => {
    if (pError) {
      return pNext(pError);
    }

    return pNext();
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

LoanSchema.methods.modifyAvailability = function modifyAvailability(pItemCounts, pNext) {
  logger.info('Preparing to modify availability...');
  async.eachSeries(pItemCounts, modifyItemAvailability, pNext);
};

LoanSchema.methods.countReturns = function countReturns(pDeltaItems) {
  // console.log(JSON.stringify(delta_items) + ' ' + delta_items.length);
  const self = this;
  const counts = {};
  for (let i = 0; i < pDeltaItems.length; i += 1) {
    if (!pDeltaItems[i]._id) {
      return new Error('Encountered an item without _id');
    }
    const item = self.findWithIndex(pDeltaItems[i]._id);

    // Only continue if referenced item exists
    if (item) {
      if (typeof item.data.return_date === 'undefined' && typeof pDeltaItems[i].return_date !== 'undefined') {
        // We now know that the item did not have a return date and a new one is proposed
        if (!isValidDate(new Date(pDeltaItems[i].return_date))) {
          return Error('Received an invalid date');
        }

        // Valid item with valid date
        if (!(item.data.item in counts)) {
          // New item, push important info to array
          counts[item.data.item] = {index: item.index, date: pDeltaItems[i].return_date, count: 1};
        } else {
          // Item is already known
          counts[item.data.item].count += 1;
        }
      }
    } else {
      return new Error(`Id:${pDeltaItems[i]._id} was not found in items`);
    }
  }

  // Convert counts to array of objects
  const arrayCounts = [];
  Object.keys(counts).forEach((pKey) => {
    arrayCounts.push({
      id: pKey,
      index: counts[pKey].index,
      date: counts[pKey].date,
      count: counts[pKey].count});
  });

  return arrayCounts;
};

LoanSchema.methods.findWithIndex = function fintWithIndex(pItemId) {
  for (let i = 0; i < this.items.length; i += 1) {
    if (this.items[i]._id.toString() === pItemId.toString()) {
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
