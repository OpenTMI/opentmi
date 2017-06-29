// native modules
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 3rd party modules
const logger = require('winston');
const nconf = require('nconf');

const filedbPath = nconf.get('filedb');
const checksum = require('./checksum');


/**
 * Data structure that represents a file in the filedbPath, which may or may not be already stored
 * filename will default to the sha1 checksum of pData
 * @param {string|Buffer|Uint8Array} pData - data that the file contains
 * @param {boolean} pIsCompressed - states the initial compression state of the file
 * @param {string} customFilename - custom filename to use instead of sha1 checksum of pData
 */
class File {
  constructor(pData, pIsCompressed = false, customFilename = undefined) {
    this.isCompressed = pIsCompressed;

    this.data = pData;
    this.size = pData.length;

    this.checksum = checksum(pData, 'sha1');
    this.filename = customFilename || `${this.checksum}.gz`;
  }

  /**
   * Compress the file with zlib.gzip
   * Compressed data overwrites the current data in file
   * Will not compress already compressed files
   * @returns {Promise} promise to compress the data in this file
   */
  compress() {
    if (this.isCompressed) {
      return Promise.reject('This file is already compressed, compressing it again would be moot');
    }

    return new Promise((resolve, reject) => {
      zlib.gzip(this.data, (error, compressedData) => {
        if (error) {
          logger.warn(error);
          return reject(error);
        }

        this.data = compressedData;
        this.size = this.data.length;
        this.isCompressed = true;
        return resolve(this);
      });

      return undefined;
    });
  }

  /**
   * Uncompresses the file with zlib.gunzip
   * Uncompressed data overwrites the compressed data
   * Will not uncompress already uncompressed files
   * @returns {Promise} promise to uncrompress the data in this file
   */
  uncompress() {
    if (!this.isCompressed) {
      return Promise.reject('this file is not compressed, uncompressing this file is not recommended');
    }

    return new Promise((resolve, reject) => {
      zlib.gunzip(this.data, (error, uncompressedData) => {
        if (error) {
          logger.warn(error);
          return reject(error);
        }

        this.data = uncompressedData;
        this.size = this.data.length;
        this.isCompressed = false;
        return resolve(this);
      });

      return undefined;
    });
  }
}

/**
 * Data structure consisting of static functions that can be used to manipulate filedb
 * includes reading and storing operations, remove not yet supported
 */
class FileDB {
  /**
   * Reads and uncompresses a stored file with a specific filename
   * @param {string|Buffer|integer} pFilename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise to read a file with a File as resolve parameter
   */
  static readFile(pFilename) {
    const filename = !pFilename.endsWith('.gz') ? pFilename : `${pFilename}.gz`;
    return FileDB._readFile(filename).then(file => file.uncompress());
  }

  /**
   * Compresses and stores data with sha1 checksum as the filename
   * @param {string|Buffer|Uint8Array} pData - data to store
   * @returns {Promise} promise to write a compressed file with a File as resolve parameter
   */
  static storeData(pData) {
    if (!(pData instanceof Array)) {
      return Promise.reject('provided data is not a subtype of Array');
    }

    const file = new File(pData, false);
    return FileDB.storeFile(file);
  }

  /**
   * Compresses and stores a file with the file instances filename.
   * @param {File} pFile - instance of an uncompressed File
   * @returns {Promise} promise to write a compressed file with a File as resolve parameter
   */
  static storeFile(pFile) {
    if (!(pFile instanceof File)) {
      return Promise.reject('provided file is not instance of File');
    }

    logger.warn('Storing file %s (filename: %s)', pFile.filename, pFile.checksum);
    return FileDB._filenameFree(pFile.filename).then(pFile.compress()).then(FileDB._writeFile(pFile));
  }

  /**
   * Ensures that there is no file stored with the provided filename
   * @param {string|Buffer|integer} pFilename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise that there is no file with the given name with
   *                    boolean variable as the resolve parameter
   */
  static _filenameFree(pFilename) {
    logger.verbose(`resolving filePath from filedbPath: ${filedbPath} and filename: ${pFilename}`);
    const filePath = path.join(filedbPath, pFilename);

    return new Promise((resolve, reject) => {
      logger.debug('checking if file exists in path: %s', filePath);
      fs.exists(filePath, (exists) => {
        if (exists) {
          logger.warn('File %s already exists with full path: %s', pFilename, filePath);
          return reject(`filename is not free, file: ${filePath} exists.`);
        }

        logger.debug(`path: ${filePath} is confirmed to be empty`);
        return resolve(exists);
      });
    });
  }

  /**
   * Reads a stored file with a specific filename
   * @param {string|Buffer|integer} pFilename - filename or file descriptor, is usually the sha1 checksum of the data
   * @returns {Promise} promise to read a file with a File as the resolve parameter
   */
  static _readFile(pFilename) {
    const filePath = path.join(filedbPath, pFilename);

    return new Promise((resolve, reject) => {
      logger.debug(`reading file from: ${filePath}`);
      fs.readFile(filePath, (error, dataBuffer) => {
        if (error) {
          logger.warn(`could not read file with path: ${filePath}, error: ${error.message}.`);
          return reject(error);
        }

        const file = new File(dataBuffer, true);
        file.filePath = filePath;

        logger.debug(`file of size: ${file.size} read`);
        return resolve(file);
      });
    });
  }

  /**
   * Writes an instance of File to filedbPath
   * @param {File} pFile - valid instance of File with data
   * @returns {Promise} promise to write the file to filedbPath with a File as resolve parameter
   */
  static _writeFile(pFile) {
    const filePath = path.join(filedbPath, pFile.filename);

    return new Promise((resolve, reject) => {
      logger.debug(`writing file to file system with path: ${filePath}`);
      fs.writeFile(filePath, pFile.data, (error) => {
        if (error) {
          logger.warn(`could not write data to path: ${filePath}, error: ${error.message}.`);
          return reject(error);
        }

        logger.debug(`file successfully written to path: ${filePath}`);
        pFile.filePath = filePath;
        return resolve(pFile);
      });
    });
  }
}


module.exports = FileDB;
