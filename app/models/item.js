var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;

var QueryPlugin = require('mongoose-query');

var ItemSchema = new Schema({
  barcode : { type: String, unique:true },
  name : { type: String, required:true, unique:true },
  image_src: { type: String },
  text_description: { type: String },
  external_reference : { type: String },
  in_stock : { type: Number, required:true, default: 0, min:0 }, // total amount of SKUs
  available: { type: Number, required:true, default: 0, min:0 }, // in_stock - loaned
  date_created : { type: Date },
  category : { type: String, required:true,
               enum:['accessory',
                     'board',
                     'component',
                     'other'],
               default:'other' }
});

/**
 * Query plugin
 */
ItemSchema.plugin( QueryPlugin ); //install QueryPlugin

ItemSchema.pre('save', function(next) {
  if (this.available > this.in_stock) { return next(new Error('availability cannot be higher than in_stock')); }
  next();	
});

mongoose.model("Item", ItemSchema);
