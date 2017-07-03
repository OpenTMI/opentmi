// native modules
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 3rd party modules
const nconf = require('../../config');
const logger = require('winston');
const Promise = require('bluebird');

// Local modules
const FileSchema = require('../models/file.js');

const filedb = nconf.get('filedb');
const fileEnding = '.gz';

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
    if (!(pFile instanceof FileSchema)) {
      return Promise.reject(new Error('provided file is not an instance of FileSchema'));
    }

    if (!pFile.checksum()) {
      return Promise.reject(new Error('Could not resolve a checksum for the file'));
    }

    logger.info(`reading file ${pFile.name} (filename: ${pFile.checksum()}).`);
    return FileDB._readFile(pFile.checksum()).then(fileData => FileDB._uncompress(fileData));
  }

  /**
   * Compresses and stores a file with the file instances filename.
   * @param {FileSchema} pFile - instance of an uncompressed File
   * @returns {Promise} promise to write a compressed file with a File as resolve parameter
   */
  static storeFile(pFile) {
    if (!(pFile instanceof FileSchema)) {
      return Promise.reject(new Error('provided file is not an instance of FileSchema'));
    }

    if (!pFile.checksum()) {
      return Promise.reject(new Error('Could not resolve a checksum for the file'));
    }

    logger.info(`storing file ${pFile.name} (filename: ${pFile.checksum()}).`);
    return FileDB._checkFilenameAvailability(pFile.filename).then((available) => {
      if (available) {
        return pFile.compress().then(FileDB._writeFile(pFile));
      }

      logger.info('File already exists, no need to store a duplicate');
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

    return new Promise((resolve) => {
      logger.debug('checking if file exists in path: %s', filePath);
      fs.exists(filePath, (exists) => {
        if (exists) logger.debug('file %s already exists in path: %s', pFilename, filePath);
        else        logger.debug(`path: ${filePath} is confirmed to be empty`); // eslint-disable-line

        return resolve(exists);
      });
    });
  }

  /**
   * Reads a stored file with a specific filename
   * @param {string|Buffer|integer} pFilename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise to read a file with a dataBuffer as the resolve parameter
   */
  static _readFile(pFilename) {
    const filePath = FileDB._resolveFilename(pFilename);

    return new Promise((resolve, reject) => {
      logger.debug(`reading file from: ${filePath}.`);
      fs.readFile(filePath, (error, dataBuffer) => {
        if (error) {
          logger.warn(`could not read file with path: ${filePath}, error: ${error.message}.`);
          return reject(error);
        }

        logger.debug(`read file (filename: ${pFilename} size: ${dataBuffer.size}).`);
        return resolve(dataBuffer);
      });
    });
  }

  /**
   * Writes an instance of File to filedb
   * @param {File} pFile - valid instance of File with data
   * @returns {Promise} promise to write the file to filedb
   */
  static _writeFile(pFile) {
    const filePath = FileDB._resolveFilename(pFile.sha1);

    return new Promise((resolve, reject) => {
      logger.debug(`writing file to file system with path: ${filePath}.`);
      fs.writeFile(filePath, pFile.data, (error) => {
        if (error) {
          logger.warn(`could not write data to path: ${filePath}, error: ${error.message}.`);
          return reject(error);
        }

        logger.debug(`wrote file (filename: ${pFile.name} size: ${pFile.data.length}).`);
        return resolve();
      });
    });
  }

  /**
   * Compress the file with zlib.gzip
   * @returns {Promise} promise to compress the data in this file with compressed data as resolve parameter
   */
  static _compress(pUncompressedData) {
    return new Promise((resolve, reject) => {
      logger.debug(`compressing data of size: ${pUncompressedData.length}`);
      zlib.gzip(pUncompressedData, (error, compressedData) => {
        if (error) {
          logger.warn(`could not compress file, error with message: ${error.message}`);
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
   * @returns {Promise} promise to uncrompress the data in this file with uncompressed data as resolve parameter
   */
  static _uncompress(pCompressedData) {
    return new Promise((resolve, reject) => {
      logger.debug(`uncompressing file with filename: ${this.filename}`);
      zlib.gunzip(pCompressedData, (error, uncompressedData) => {
        if (error) {
          logger.warn(`could not uncompress file with filename: ${this.filename}, error with message: ${error.message}`);
          return reject(error);
        }

        logger.verbose('Uncompress result:');
        logger.verbose(`  compressed size  : ${pCompressedData.length}`);
        logger.verbose(`  uncompressed size: ${uncompressedData.length}`);
        return resolve(uncompressedData);
      });

      return undefined;
    });
  }

  /**
   * Uses defined filedb, name and fileEncding to create a valid path for a file
   * @param {String} name - name of the file, usually the sha1 checksum of the file
   * @returns {String} valid storage path for file with the provided name
   */
  static _resolveFilename(pName) {
    logger.verbose(`resolving filePath from filedb: ${filedb} and filename: ${pName} with ending: ${fileEnding}`);
    return path.join(filedb, `${pName}.${fileEnding}`);
  }
}


module.exports = FileDB;
