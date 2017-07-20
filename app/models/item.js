const mongoose = require('mongoose');
const logger = require('winston');
const QueryPlugin = require('mongoose-query');

const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  barcode: {type: String, unique: true, sparse: true},
  name: {type: String, required: true, unique: true},
  image_src: {type: String},
  text_description: {type: String},
  external_reference: {type: String},
  in_stock: {type: Number, required: true, default: 0, min: 0}, // total amount of SKUs
  available: {type: Number, required: true, default: 0, min: 0}, // in_stock - loaned
  date_created: {type: Date},
  category: {
    type: String,
    required: true,
    enum: [
      'accessory',
      'board',
      'component',
      'other'],
    default: 'other'
  }
});
// ItemSchema.index({barcode:1}, {unique:true});

/**
 * Query plugin
 */
ItemSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Pre-save hook
 */
ItemSchema.pre('save', function preSave(pNext) {
  logger.info('Item pre-save hook started');
  if (this.available > this.in_stock) {
    return pNext(new Error('availability cannot be higher than in_stock'));
  }

  return pNext();
});

/**
 * Pre-remove hook
 */
ItemSchema.pre('remove', function preRemove(pNext) {
  logger.info('Item pre-remove hook started');

  const self = this;
  const Loan = mongoose.model('Loan');

  Loan.find({}, (pError, pLoans) => {
    if (pError) return pNext(new Error('Something mysterious went wrong while fetching loans'));

    for (let i = 0; i < pLoans.length; i += 1) {
      for (let j = 0; j < pLoans[i].items.length; j += 1) {
        if (pLoans[i].items[j].item.toString() === self._id.toString()) {
          return pNext(new Error('Cannot delete this item, loans that refer to this item exist'));
        }
      }
    }
    return pNext();
  });
});

/**
 * Methods
 */
ItemSchema.methods.fetchImageData = function fetchImageData(pNext) {
  const self = this;
  const request = require('request').defaults({encoding: null}); // eslint-disable-line global-require
  request.get(self.image_src, (pError, pRes, pBody) => {
    if (pError) return pNext(new Error('could not process image get request'));

    if (pRes.statusCode === 200) {
      const imageData = {
        type: pRes.headers['content-type'],
        data: pBody
      };
      pNext(imageData);
    } else {
      return pNext(new Error(`image get request returned with an unexpected code: ${pRes.statusCode}`));
    }

    return undefined;
  });
};

const Item = mongoose.model('Item', ItemSchema);
module.exports = {Model: Item, Collection: 'Item'};
