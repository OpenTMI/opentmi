// native modules
const path = require('path');
const zlib = require('zlib');

// 3rd party modules
const nconf = require('../../config');
const logger = require('winston');
const Promise = require('bluebird');
const fs = require('fs-extra');

// Local modules
const mongoose = require('mongoose');
require('../models/file.js');

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
   * @param {FileSchema} pFile - valid instance of FileSchema, used to resolve the filename
   * @returns {Promise} promise to read a file with a File as resolve parameter
   */
  static readFile(pFile) {
    if (!(pFile instanceof File)) {
      return Promise.reject(new TypeError('Provided file is not an instance of FileSchema.'));
    }

    if (!pFile.checksum()) {
      return Promise.reject(new Error('Could not resolve a checksum for the file.'));
    }

    logger.info(`Reading file ${pFile.name} (filename: ${pFile.checksum()}.${fileEnding}).`);
    return FileDB._readFile(pFile.checksum()).then(FileDB._uncompress);
  }

  /**
   * Compresses and stores a file with the file instances filename.
   * @param {FileSchema} pFile - instance of an uncompressed File
   * @returns {Promise} promise to write a compressed file with a File as resolve parameter
   */
  static storeFile(pFile) {
    if (!(pFile instanceof File)) {
      return Promise.reject(new TypeError('Provided file is not an instance of FileSchema.'));
    }

    if (!pFile.checksum()) {
      return Promise.reject(new Error('Could not resolve a checksum for the file.'));
    }

    logger.info(`Storing file ${pFile.name} (filename: ${pFile.checksum()}.${fileEnding}).`);
    return FileDB._checkFilenameAvailability(pFile.checksum()).then((available) => {
      if (available) {
        return FileDB._compress(pFile.data).then(compressedData => FileDB._writeFile(pFile.checksum(), compressedData));
      }

      logger.warn('File already exists, no need to store a duplicate.');
      return Promise.resolve;
    });
  }

  /**
   * Ensures that there is no file stored with the provided filename
   * @param {string|Buffer|integer} pFilename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise that there is no file with the given name with
   *                    boolean variable as the resolve parameter
   */
  static _checkFilenameAvailability(pFilename) {
    const filePath = FileDB._resolveFilename(pFilename);

    logger.debug(`Checking if file exists in path: ${filePath}.`);
    return fs.exists(filePath).then((exists) => {
      if (exists) logger.debug(`File ${pFilename} already exists in path: ${filePath}.`);
      else        logger.debug(`Path: ${filePath} is confirmed to be empty.`); // eslint-disable-line

      return !exists;
    });
  }

  /**
   * Reads a stored file with a specific filename
   * @param {string|Buffer|integer} pFilename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise to read a file with a dataBuffer as the resolve parameter
   */
  static _readFile(pFilename) {
    const filePath = FileDB._resolveFilename(pFilename);

    logger.debug(`Reading file from: ${filePath}.`);
    return fs.readFile(filePath).then((dataBuffer) => {
      logger.debug(`Read file (filename: ${pFilename} size: ${dataBuffer.size}).`);
      return dataBuffer;
    }).catch((error) => {
      logger.warn(`Could not read file with path: ${filePath}, error: ${error.message}.`);
      throw error;
    });
  }

  /**
   * Writes an instance of File to filedb
   * @param {File} pFilename - name of the file to write, without the file ending
   * @param {string|Buffer} pData - data to write
   * @returns {Promise} promise to write the file to filedb
   */
  static _writeFile(pFilename, pData) {
    const filePath = FileDB._resolveFilename(pFilename);

    // Ensure there is data to write
    if (!pData) {
      const errorMessage = `Cannot write file, no data defined, received: ${pData}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    logger.debug(`Writing file to file system with path: ${filePath}.`);
    return fs.writeFile(filePath, pData).then(() => {
      logger.debug(`Wrote file (filename: ${pFilename} size: ${pData.length || '0'}).`);
    }).catch((error) => {
      logger.warn(`Could not write data to path: ${filePath}, error: ${error.message}.`);
      throw error;
    });
  }

  /**
   * Compress data with zlib.gzip
   * @param {string|Buffer} pUncompressedData - data that should be compressed
   * @returns {Promise} promise to compress the data in this file with compressed data as resolve parameter
   */
  static _compress(pUncompressedData) {
    // Ensure there is data to write
    if (!pUncompressedData) {
      const errorMessage = `Failed to compress, no data provided, received: ${pUncompressedData}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    return new Promise((resolve, reject) => {
      logger.debug(`Compressing data of size: ${pUncompressedData.length}.`);
      zlib.gzip(pUncompressedData, (error, compressedData) => {
        if (error) {
          logger.warn(`Could not compress file, error with message: ${error.message}.`);
          return reject(error);
        }

        logger.verbose('Compress result:');
        logger.verbose(`  uncompressed size: ${pUncompressedData.length}`);
        logger.verbose(`  compressed size  : ${compressedData.length}`);
        return resolve(compressedData);
      });

      return undefined;
    });
  }

  /**
   * Uncompresses the file with zlib.gunzip
   * @param {string|Buffer} pCompressedData - data that has been compressed
   * @returns {Promise} promise to uncrompress the data in this file with uncompressed data as resolve parameter
   */
  static _uncompress(pCompressedData) {
    // Ensure there is data to write
    if (!pCompressedData) {
      const errorMessage = `Failed to uncompress, no data provided, received: ${pCompressedData}.`;
      logger.warn(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    return new Promise((resolve, reject) => {
      logger.debug(`Uncompressing file with filename: ${this.filename}.`);
      zlib.gunzip(pCompressedData, (error, uncompressedData) => {
        if (error) {
          logger.warn(`Could not uncompress file with filename: ${this.filename}, error with message: ${error.message}.`);
          return reject(error);
        }

        logger.verbose('Uncompress result:');
        logger.verbose(`  compressed size  : ${pCompressedData.length}`);
        logger.verbose(`  uncompressed size: ${uncompressedData.length}`);
        return resolve(uncompressedData.toString(usedEncoding));
      });

      return undefined;
    });
  }

  /**
   * Uses defined filedb, name and fileEnding to create a valid path for a file
   * @param {String} pName - name of the file, usually the sha1 checksum of the file
   * @returns {String} valid storage path for file with the provided name
   */
  static _resolveFilename(pName) {
    if (!pName) {
      const errorMessage = `cannot resolve filename, no name provided, received: ${pName}`;
      logger.warn(errorMessage);
      throw Error(errorMessage);
    }

    logger.verbose(`resolving filePath from filedb: ${filedb} and filename: ${pName} with ending: ${fileEnding}`);
    return path.join(filedb, `${pName}.${fileEnding}`);
  }
}


module.exports = FileDB;
