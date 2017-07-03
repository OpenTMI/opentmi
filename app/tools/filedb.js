// native modules
var fs = require('fs');
var path = require('path');
const zlib = require('zlib');

// 3rd party modules
var _ = require('lodash');
var logger = require('winston');
const nconf = require('../../config');

var filedb = nconf.get('filedb');
var checksum = require('./checksum');

module.exports.provider = filedb;
module.exports.readFile = function readFile(file, callback) {
    var source = path.join(filedb, file.sha1+'.gz');
    logger.debug('loading source: ', source);
    fs.readFile(source, function(err, buffer) {
        if(err) {
            return callback(err);
        }
        logger.debug("file readed");
        zlib.gunzip(buffer, function (error, data) {
            logger.debug("data gunzipped");
            callback(error, data?_.merge({}, file, {data: data}):null);
        });
    });
};

module.exports.storeFile = function storeFile(file, callback) {

  if(!_.has(file, 'size')) {
      file.size = file.data.length;
  }
  if(!_.has(file, 'sha1')) {
      file.sha1 = checksum(file.data, 'sha1');
  }
  if(!_.isFunction(callback)) {
      callback = function(){};
  }

  var target = path.join(nconf.get('filedb'), file.sha1+'.gz');
  var fileData = file.data;
  fs.exists(target, function(exists) {
    if (exists) {
      logger.warn('File %s exists already (filename: %s)', file.name, target);
      return callback();
    }
    logger.warn('Store file %s (filename: %s)', file.name, target);
    zlib.gzip(fileData, function (error, result) {
      if (error) {
        logger.warn(error);
        return callback(error);
      }
      fs.writeFile(target, result, function (err) {
        if (err) {
          logger.warn(err);
          return callback(err);
        }
        callback();
      });
    });
  });
}