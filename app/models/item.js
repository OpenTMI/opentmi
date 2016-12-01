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
  in_stock : { type: Number, default: 0 }, // total amount of SKUs
  available: { type: Number, default: 0 }, // in_stock - loaned
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

mongoose.model("Item", ItemSchema);
