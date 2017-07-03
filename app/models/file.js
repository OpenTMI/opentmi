//native modules
var path = require('path');

// 3rd party modules
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var nconf = require('../../config');
var file_provider = nconf.get('filedb');

var FileSchema = new Schema({
    //buffer limit 16MB when attached to document!
    name: {type: String},
    mime_type: {type: String},
    base64: {type: String},
    data: {type: Buffer},
    size: {type: Number},
    sha1: {type: String},
    sha256: {type: String}
});
FileSchema.set('toObject', {virtuals: true});

FileSchema.virtual('hrefs').get(
    function () {
        var href;
        if (file_provider && file_provider !== 'mongodb' && this.sha1) {
            href = path.join(file_provider, this.sha1);
        }
        return href;
    });

module.exports = FileSchema;
