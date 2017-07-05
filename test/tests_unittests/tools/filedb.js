/* global describe before after beforeEach afterEach it */
// Third party modules
require('colors');
const nconf = require('../../../config');
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');

const mongoose = require('mongoose');
require('../../../app/models/file.js');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

const Promise = require('bluebird');
const logger = require('winston');
logger.level = 'error';

const File = mongoose.model('File');

// Local modules
const checksum = require('../../../app/tools/checksum.js');
const filedbPath = path.resolve('app/tools/filedb.js');

let filedb;

// const tempStoragePath = './test/tests_unittests/tests_tools/temp_files';
const sampleTextsToStore = [
  'Lorem lapsem, udum masteruk sommersby',
  '{ "suite": { "results" : [ "fail", "pass", "pass", "destruction" ] } }',
  'null',
];
const sampleTextsToRead = [
  'The quick brown fox jumps over the lazy dog',
  'The fast brown fox jumps over the lazy dog',
  'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum ' +
    'has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer ' +
    'took a galley of type and scrambled it to make a type specimen book.',
];

let sampleFilesToStore = [];
let sampleDataToRead = [];

// Should probably use a separate folder just for testing, feasible only after test environment is configured and used
const filedbLocation = nconf.get('filedb');


describe('tools/filedb.js', function () {
  // Run this before tests
  before(function (done) {
    logger.verbose('[Before]'.gray);

    // Create folder where to store temporary files
    logger.verbose('Creating folder for temporary files.'.gray);
    if (!fs.existsSync(filedbLocation)) {
      fs.mkdirSync(filedbLocation);
    }

    done();
  });

  after(function (done) {
    // logger.verbose('[After]'.gray);
    // Remove folder where temp files are stored, please do be careful if editing
    // TODO uncomment, but only after test environment is configured and used
    // fs.rmdir(tempStoragePath, done);
    done();
  });

  beforeEach(function (done) {
    logger.verbose('[Before Each]'.gray);
    logger.verbose('Requiring fresh filedb for test so we can mock some of its functionality.'.gray);
    delete require.cache[filedbPath];
    filedb = require('../../../app/tools/filedb.js'); // eslint-disable-line

    done();
  });

  afterEach(function (done) {
    // Read and unlink files in temp storage folder
    logger.verbose('[After Each]'.gray);
    logger.verbose('Deleting all files from filedb location.'.gray);
    const items = fs.readdirSync(filedbLocation);
    items.map(item => fs.unlinkSync(path.join(filedbLocation, item)));

    // Solve all promises
    done();
  });


  describe('readFile', function () {
    it('readFile - valid file', function () {
      const sampleFile = new File({ sha1: 'test_read_name' });
      const compressedData = new Buffer('data received from file');
      const uncompressedData = 'uncompressed_data';

      filedb._readFile = (filename) => {
        expect(filename).to.equal(sampleFile.sha1, 'filename should be passed without modifications to _readFile');
        return Promise.resolve(compressedData);
      };
      filedb._uncompress = (data) => {
        expect(data).to.deep.equal(compressedData, 'data that is to be uncompressed should be the data provided by the _readFile');
        return Promise.resolve(uncompressedData);
      };

      // Test read and unzip dummy files
      const readPromises = expect(filedb.readFile(sampleFile)).to.eventually.equal(uncompressedData);
      return Promise.all(readPromises);
    });

    it('readFile - file not an instance of File', function () {
      // Should fail
      return expect(filedb.readFile('not a file')).to.be.rejectedWith(TypeError);
    });

    it('readFile - compress is rejected', function () {
      // Should fail
      filedb._readFile = () => Promise.resolve('corrupted data');
      filedb._uncompress = () => Promise.reject(new Error('corruption'));

      return expect(filedb.readFile(new File({ sha1: 'checksum' }))).to.be.rejectedWith(Error);
    });

    it('readFile - read is rejected', function () {
      // Read file that does not exist, should fail
      filedb._readFile = () => Promise.reject(new Error('could not find file.'));
      return expect(filedb.readFile(new File({ sha1: 'checksum' }))).to.be.rejectedWith(Error);
    });
  });


  describe('storeFile', function () {
    it('storeFile - valid files', function () {
      // Store files
      const compressedData = 'compressed data';
      const sampleFile = new File({ sha1: 'checksum', data: 'tested store data' });

      filedb._compress = (data) => {
        expect(data).to.equal(sampleFile.data);
        return Promise.resolve(compressedData);
      };
      filedb._writeFile = (filename, data) => {
        expect(filename).to.equal(sampleFile.sha1);
        expect(data).to.equal(compressedData);
        Promise.resolve();
      };

      return filedb.storeFile(sampleFile);
    });

    it('storeFile - not an instance', function () {
      // Should fail
      return expect(filedb.storeFile('not a file')).to.be.rejectedWith(TypeError);
    });

    it('storeFile - unresolvable checksum', function () {
      // Should fail
      const sampleFile = new File({ name: 'test name' });
      return expect(filedb.storeFile(sampleFile)).to.be.rejectedWith(Error);
    });

    it('storeFile - name already taken', function () {
      // Should pass
      const sampleFile = new File({ sha1: 'checksum' });
      filedb._checkFilenameAvailability = () => Promise.resolve(false);
      return filedb.storeFile(sampleFile);
    });

    it('storeFile - compress is rejected', function () {
      // Should be rejected
      const sampleFile = new File({ sha1: 'checksum', data: 'data' });
      filedb._checkFilenameAvailability = () => Promise.reject(new Error('compression failed'));
      filedb._writeFile = () => Promise.reject(new Error('error'));
      return expect(filedb.storeFile(sampleFile)).to.be.rejectedWith(Error);
    });

    it('storeFile - write is rejected', function () {
      // Should be rejected
      const sampleFile = new File({ sha1: 'checksum', data: 'data' });
      filedb._checkFilenameAvailability = () => Promise.resolve('data');
      filedb._writeFile = () => Promise.reject(new Error('write failed'));
      return expect(filedb.storeFile(sampleFile)).to.be.rejectedWith(Error);
    });
  });


  describe('_checkFilenameAvailability', function () {
    beforeEach(function (done) {
      fs.writeFileSync(path.join(filedbLocation, 'existing_testing_filename.gz'), 'data');
      done();
    });

    it('_checkFilenameAvailability - available', function () {
      return expect(filedb._checkFilenameAvailability('available_name')).to.eventually.equal(true, 'available filename should result in true');
    });

    it('_checkFilenameAvailability - unavailable', function () {
      return expect(filedb._checkFilenameAvailability('existing_testing_filename')).to.eventually.equal(false, 'unavailable filename should result in false');
    });
  });


  describe('_readFile', function () {
    before(function (done) {
      // Store both compressed and uncompressed versions of samples that will be read
      logger.verbose('Composing sample files to read from mock data.'.gray);
      sampleDataToRead = sampleTextsToRead.map((text) => {
        const obj = { filename: checksum(text), data: text };
        return obj;
      });

      done();
    });

    beforeEach(function (done) {
      logger.verbose('[Before Each Read]'.gray);
      logger.verbose('Creating promises to write valid files for tests to read.'.gray);
      sampleDataToRead.forEach(obj => fs.writeFileSync(path.join(filedbLocation, `${obj.filename}.gz`), obj.data));

      done();
    });

    it('_readFile - valid files', function () {
      // Test read and unzip dummy files
      filedb._resolveFilename = filename => path.join(filedbLocation, `${filename}.gz`);
      const readPromises = sampleDataToRead.map(obj => expect(filedb._readFile(obj.filename)).to.eventually.deep.equal(new Buffer(obj.data)));
      return Promise.all(readPromises);
    });

    it('_readFile - nonexistent file', function () {
      filedb._resolveFilename = filename => path.join(filedbLocation, `${filename}.gz`);
      return expect(filedb._readFile('nonexistent_file')).to.be.rejectedWith(Error, undefined, '_readFile should be rejected if a nonexistent file is provided');
    });

    it('_readFile - no filename', function () {
      filedb._resolveFilename = filename => path.join(filedbLocation, `${filename}.gz`);
      return expect(filedb._readFile(undefined)).to.be.rejectedWith(Error, undefined, '_readFile should be rejected if no filename is provided');
    });
  });


  describe('_writeFile', function () {
    beforeEach(function (done) {
      logger.verbose('[BeforeEach - Store]'.gray);
      logger.verbose('Composing sample files to write from mock data'.gray);
      sampleFilesToStore = sampleTextsToStore.map((text) => {
        const obj = { filename: checksum(text), data: text };
        return obj;
      });

      done();
    });

    it('_writeFile - valid files', function () {
      filedb._resolveFilename = filename => path.join(filedbLocation, `${filename}.gz`);
      const writePromises = sampleFilesToStore.map(obj => filedb._writeFile(obj.filename, obj.data).then(() => {
        const newFilePath = path.join(filedbLocation, `${obj.filename}.gz`);
        expect(fs.existsSync(newFilePath)).to.equal(true, `newly created file at path: ${newFilePath} does not exist.`);
        expect(fs.readFileSync(newFilePath)).to.deep.equal(new Buffer(obj.data));
        return Promise.resolve;
      }));

      return Promise.all(writePromises);
    });

    it('_writeFile - no data', function () {
      filedb._resolveFilename = filename => path.join(filedbLocation, `${filename}.gz`);
      return expect(filedb._writeFile('empty_file', undefined)).to.be.rejectedWith(Error, undefined, '_writeFile should be rejected if no data is provided');
    });

    it('_writeFile - no filename', function () {
      filedb._resolveFilename = filename => path.join(filedbLocation, `${filename}.gz`);
      return expect(filedb._writeFile(undefined, undefined)).to.be.rejectedWith(Error, undefined, '_writeFile should be rejected if no filename is provided');
    });
  });


  describe('_compress', function () {
    it('_compress - valid data', function () {
      const sampleData = sampleTextsToStore.map((text) => {
        const obj = { uncompressed: text, compressed: zlib.gzipSync(text) };
        return obj;
      });

      const compressPromises = sampleData.map(data => expect(filedb._compress(data.uncompressed)).to.eventually.deep.equal(data.compressed));
      return Promise.all(compressPromises);
    });

    it('_compress - no data', function () {
      return expect(filedb._compress(undefined)).to.be.rejectedWith(Error, undefined, '_compress should throw an error if no data is provided');
    });
  });


  describe('_uncompress', function () {
    it('_uncompress - valid data', function () {
      const sampleData = sampleTextsToRead.map((text) => {
        const obj = { uncompressed: text, compressed: zlib.gzipSync(text) };
        return obj;
      });

      const uncompressPromises = sampleData.map(data => expect(filedb._uncompress(data.compressed)).to.eventually.deep.equal(data.uncompressed));
      return Promise.all(uncompressPromises);
    });

    it('_uncompress - no data', function () {
      return expect(filedb._uncompress(undefined)).to.be.rejectedWith(Error, undefined, '_uncompress should throw an error if no data is provided');
    });
  });


  describe('_resolveFilename', function () {
    it('_resolveFilename - valid filename', function (done) {
      const correctPath = path.join(filedbLocation, 'file_name.gz');
      expect(filedb._resolveFilename('file_name')).to.equal(correctPath, 'given a valid filename _resolveFilename should return data/file_name.gz');
      done();
    });

    it('_resolveFilename - no filename', function (done) {
      expect(filedb._resolveFilename).to.throw(Error, undefined, '_resolveFilename should throw an Error if called without filename');
      done();
    });
  });
});
