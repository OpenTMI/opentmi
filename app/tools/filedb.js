// Native components
const path = require('path');
const zlib = require('zlib');

// Third party components
const nconf = require('../../config');
const logger = require('winston');
const Promise = require('bluebird');
const fs = require('fs-extra');

// Local components
const mongoose = require('mongoose');
require('../models/extends/file.js');

const usedEncoding = 'utf8';
const File = mongoose.model('File');
const filedb = nconf.get('filedb');
const fileEnding = 'gz';

/**
 * Collection of static functions that can be used to manipulate the filedb
 * includes reading and storing operations, find and remove not yet supported
 */
class FileDB {
  /**
   * Reads and uncompresses stored data that is related to provided file
   * @param {FileSchema} file - valid instance of FileSchema, used to resolve the filename
   * @returns {Promise} promise to read a file with a File as resolve parameter
   */
  static readFile(file) {
    if (!(file instanceof File)) {
      return Promise.reject(new TypeError('Provided file is not an instance of FileSchema.'));
    }

    if (!file.checksum()) {
      return Promise.reject(new Error('Could not resolve a checksum for the file.'));
    }

    logger.info(`Reading file ${file.name} (filename: ${file.checksum()}.${fileEnding}).`);
    return FileDB._readFile(file.checksum()).then(FileDB._uncompress);
  }

  /**
   * Compresses and stores a file with the file instances filename.
   * @param {FileSchema} file - instance of an uncompressed File
   * @returns {Promise} promise to write a compressed file with a File as resolve parameter
   */
  static storeFile(file) {
    if (!(file instanceof File)) {
      return Promise.reject(new TypeError('Provided file is not an instance of FileSchema.'));
    }

    if (!file.checksum()) {
      return Promise.reject(new Error('Could not resolve a checksum for the file.'));
    }

    logger.info(`Storing file ${file.name} (filename: ${file.checksum()}.${fileEnding}).`);
    return FileDB._checkFilenameAvailability(file.checksum()).then((available) => {
      if (available) {
        return FileDB._compress(file.data).then((compressedData) => {
          const filename = file.checksum();
          return FileDB._writeFile(filename, compressedData);
        });
      }

      logger.warn('File already exists, no need to store a duplicate.');
      return Promise.resolve();
    });
  }

  /**
   * Ensures that there is no file stored with the provided filename
   * @param {string|Buffer|integer} filename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise that there is no file with the given name with
   *                    boolean variable as the resolve parameter
   */
  static _checkFilenameAvailability(filename) {
    const filePath = FileDB._resolveFilePath(filename);

    logger.debug(`Checking if file exists in path: ${filePath}.`);
    return fs.exists(filePath).then((exists) => {
      if (exists) logger.debug(`File ${filename} already exists in path: ${filePath}.`);
      else        logger.debug(`Path: ${filePath} is confirmed to be empty.`); // eslint-disable-line

      return !exists;
    });
  }

  /**
   * Reads a stored file with a specific filename
   * @param {string|Buffer|integer} filename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise to read a file with a dataBuffer as the resolve parameter
   *
   * @todo Large files will most likely cause problems, stream support would solve this
   * @todo Read file size before reading the whole file, needs streams
   */
  static _readFile(filename) {
    const filePath = FileDB._resolveFilePath(filename);

    logger.debug(`Reading file from file system with path: ${filePath}.`);
    return fs.readFile(filePath).then((dataBuffer) => {
      logger.debug(`Read file (filename: ${filename} size: ${dataBuffer.size}).`);
      return dataBuffer;
    }).catch((error) => {
      const errorMessage = `Could not read file with path: ${filePath}, error: ${error.message}.`;
      logger.warn(errorMessage);
      throw error;
    });
  }

  /**
   * Writes an instance of File to filedb
   * @param {File} filename - name of the file to write, without the file ending
   * @param {string|Buffer} data - data to write
   * @returns {Promise} promise to write the file to filedb
   *
   * @todo Large files will most likely cause problems, stream support would solve this
   */
  static _writeFile(filename, data) {
    const filePath = FileDB._resolveFilePath(filename);

    // Ensure there is data to write
    if (!data) {
      const errorMessage = `Cannot write file, no data defined, received: ${data}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    logger.debug(`Writing file to file system with path: ${filePath}.`);
    return fs.writeFile(filePath, data).then(() => {
      logger.debug(`Wrote file (filename: ${filename} size: ${data.length || '0'}).`);
    }).catch((error) => {
      const errorMessage = `Could not write data to path: ${filePath}, error: ${error.message}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    });
  }

  /**
   * Compress data with zlib.gzip
   * @param {string|Buffer} uncompressedData - data that should be compressed
   * @returns {Promise} promise to compress the data in this file with compressed data as resolve parameter
   */
  static _compress(uncompressedData) {
    // Ensure there is data to write
    if (!uncompressedData) {
      const errorMessage = `Failed to compress, no data provided, received: ${uncompressedData}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    return new Promise((resolve, reject) => {
      logger.debug(`Compressing data of size: ${uncompressedData.length}.`);
      zlib.gzip(uncompressedData, (error, compressedData) => {
        if (error) {
          const errorMessage = `Could not compress file, error with message: ${error.message}.`;
          logger.warn(errorMessage);
          return reject(errorMessage);
        }

        logger.verbose('Compress result:');
        logger.verbose(`  uncompressed size: ${uncompressedData.length}`);
        logger.verbose(`  compressed size  : ${compressedData.length}`);
        return resolve(compressedData);
      });

      return undefined;
    });
  }

  /**
   * Uncompresses the file with zlib.gunzip
   * @param {string|Buffer} compressedData - data that has been compressed
   * @returns {Promise} promise to uncrompress the data in this file with uncompressed data as resolve parameter
   */
  static _uncompress(compressedData) {
    // Ensure there is data to write
    if (!compressedData) {
      const errorMessage = `Failed to uncompress, no data provided, received: ${compressedData}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    return new Promise((resolve, reject) => {
      logger.debug(`Uncompressing data of size: ${compressedData.length}.`);
      zlib.gunzip(compressedData, (error, uncompressedData) => {
        if (error) {
          const errorMessage = `Could not uncompress, error with message: ${error.message}.`;
          logger.warn(errorMessage);
          return reject(errorMessage);
        }

        logger.verbose('Uncompress result:');
        logger.verbose(`  compressed size  : ${compressedData.length}`);
        logger.verbose(`  uncompressed size: ${uncompressedData.length}`);
        return resolve(uncompressedData.toString(usedEncoding));
      });

      return undefined;
    });
  }

  /**
   * Uses defined filedb, name and fileEnding to create a valid path for a file
   * @param {String} filename - name of the file, usually the sha1 checksum of the file
   * @returns {String} valid storage path for file with the provided name
   */
  static _resolveFilePath(filename) {
    if (!filename) {
      const errorMessage = `cannot resolve filename, no name provided, received: ${filename}`;
      logger.warn(errorMessage);
      throw new Error(errorMessage);
    }

    logger.verbose(`resolving filePath from filedb: ${filedb} and filename: ${filename} with ending: ${fileEnding}`);
    return path.join(filedb, `${filename}.${fileEnding}`);
  }
}


module.exports = FileDB;
