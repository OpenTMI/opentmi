const mongoose = require('mongoose');
const logger = require('winston');
const QueryPlugin = require('mongoose-query');

const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;

const ItemSchema = new Schema({
  barcode: {type: String, unique: true, sparse: true},
  name: {type: String, required: true, unique: true},
  image_src: {type: String},
  text_description: {type: String},
  external_reference: {type: String},
  in_stock: {type: Number, required: true, default: 0, min: 0}, // total amount of SKUs
  available: {type: Number, required: true, default: 0, min: 0}, // in_stock - loaned
  unique_resources: [{type: ObjectId, ref: 'Resource'}],
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

/**
 * Query plugin
 */
ItemSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Pre-save hook
 */
ItemSchema.pre('save', function preSave(next) {
  logger.info('Item pre-save hook started');
  if (this.available > this.in_stock) {
    return next(new Error('availability cannot be higher than in_stock'));
  }

  return next();
});

/**
 * Pre-remove hook
 */
ItemSchema.pre('remove', function preRemove(next) {
  logger.info('Item pre-remove hook started');

  const self = this;
  const Loan = mongoose.model('Loan');

  Loan.find({}, (error, loans) => {
    if (error) return next(new Error('Something mysterious went wrong while fetching loans'));

    for (let i = 0; i < loans.length; i += 1) {
      for (let j = 0; j < loans[i].items.length; j += 1) {
        if (loans[i].items[j].item.toString() === self._id.toString()) {
          return next(new Error('Cannot delete this item, loans that refer to this item exist'));
        }
      }
    }
    return next();
  });
});

/**
 * Methods
 */
ItemSchema.methods.fetchImageData = function fetchImageData(next) {
  const self = this;
  const request = require('request').defaults({encoding: null}); // eslint-disable-line global-require
  request.get(self.image_src, (error, res, body) => {
    if (error) return next(new Error('could not process image get request'));

    if (res.statusCode === 200) {
      const imageData = {
        type: res.headers['content-type'],
        data: body
      };
      next(imageData);
    } else {
      return next(new Error(`image get request returned with an unexpected code: ${res.statusCode}`));
    }

    return undefined;
  });
};

const Item = mongoose.model('Item', ItemSchema);
module.exports = {Model: Item, Collection: 'Item'};
