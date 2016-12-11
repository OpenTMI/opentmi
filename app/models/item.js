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

ItemSchema.pre('remove', function(next) {
  var self = this;
  
  var Loan = mongoose.model('Loan');
  Loan.find({}, function(err, loans) {
	if (err) return next(new Error('Something mysterious went wrong while fetching loans'));
	
	for (var i = 0; i < loans.length; i++) {
	  for (var j = 0; j < loans[i].items.length; j++) {
		if (loans[i].items[j].item.toString() === self._id.toString()) return next(new Error('Cannot delete this item, loans that refer to this item exist'));
	  }
	} 
	next();
  });
});

mongoose.model("Item", ItemSchema);
