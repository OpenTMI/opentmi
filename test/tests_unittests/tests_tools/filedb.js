/* global describe before after beforeEach afterEach it */
// Third party modules
console.log('Initializing nconf');

const nconf = require('nconf');
nconf.argv({
  cfg: {
    alias: 'c',
    default: process.env.NODE_ENV || 'development',
    type: 'string',
    describe: 'Select configuration (development,test,production)',
    nargs: 1,
  },
}).defaults(require('./../../../config/config.js'));

const colors = require('colors');

const chai = require('chai');
const expect = chai.expect;

const zlib = require('zlib');

const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');

const winston = require('winston');
winston.level = 'error';

// Local modules
const tools = require('./../../../app/tools');
const checksum = tools.checksum;
const filedb = tools.filedb;

//const tempStoragePath = './test/tests_unittests/tests_tools/temp_files';
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
const corruptedFile = {
  sha1: checksum('Corrrrrrrrruption'),
  originalData: 'Corrrrrrrrruption',
  compressedData: 'Corrrrrrrrruption',
};

const sampleFilesToStore = [];
const sampleFilesToRead = [];

// Should probably use a separate folder just for testing, not feasible now in the wake of refactor
const filedbPath = nconf.get('filedb');

describe('tools/filedb.js', () => {
  before(function (done) {
    console.log('    [Before]'.gray);

    // Create folder where to store temporary files
    if (!fs.existsSync(filedbPath)) {
      fs.mkdirSync(filedbPath);
    }

     // Store both compressed and uncompressed versions of samples that will be read
    for (let i = 0; i < sampleTextsToRead.length; i += 1) {
      sampleFilesToRead.push({
        sha1: checksum(sampleTextsToRead[i]),
        originalData: sampleTextsToRead[i],
        compressedData: zlib.gzipSync(sampleTextsToRead[i]),
      });
    }

    // Store both compressed and uncompressed versions of samples that will be stored
    for (let i = 0; i < sampleTextsToStore.length; i += 1) {
      sampleFilesToStore.push({
        sha1: checksum(sampleTextsToStore[i]),
        data: sampleTextsToStore[i],
        originalData: sampleTextsToStore[i],
        compressedData: zlib.gzipSync(sampleTextsToStore[i]),
      });
    }

    done();
  });

  after(function (done) {
    console.log('\n    [After]'.gray);
    // Remove folder where temp files are stored, please do be careful if editing
    //fs.rmdir(tempStoragePath, done);
    done();
  });

  beforeEach(function () {
    const savePromises = [];
    sampleFilesToRead.forEach((file) => {
      savePromises.push(new Promise((resolve, reject) => {
        fs.writeFile(path.join(filedbPath, `${file.sha1}.gz`), file.compressedData, (error) => {
          if (!error) {
            resolve();
          } else {
            reject();
          }
        });
      }));
    });
    savePromises.push(new Promise((resolve, reject) => {
      fs.writeFile(path.join(filedbPath, `${corruptedFile.sha1}.gz`), corruptedFile.compressedData, (error) => {
        if (!error) {
          resolve();
        } else {
          reject();
        }
      });
    }));

    // Create dummy files
    return Promise.all(savePromises);
  });

  afterEach(function () {
    const savePromises = [];

    // Read files in temp storage folder
    const items = fs.readdirSync(filedbPath);
    items.forEach(function (item) {
      // Make promises to remove all files
      savePromises.push(new Promise((resolve, reject) => {
        fs.unlink(path.join(filedbPath, item), (error) => {
          if (!error) {
            resolve();
          } else {
            reject();
          }
        });
      }));
    });

    // Solve all promises
    return Promise.all(savePromises);
  });

  it('readFile.js', function () {
    // Test read and unzip dummy files
    const readPromises = [];
    sampleFilesToRead.forEach((file) => {
      readPromises.push(new Promise((resolve, reject) => {
        //console.log(file);
        filedb.readFile(file, (error, file) => {
          expect(error).to.not.exist;

          let line = '';
          const byteArray = file.data;
          for (let i = 0; i < byteArray.length; i += 1) {
            line += String.fromCharCode(byteArray[i]);
          }

          expect(line).to.equal(file.originalData);
          resolve();
        });
      }));
    });

    // Read corrupted file, should fail
    readPromises.push(new Promise((resolve) => {
      filedb.readFile(corruptedFile, (error, file) => {
        expect(error).to.exist;
        resolve();
      });
    }));

    // Read file that does not exist, should fail
    readPromises.push(new Promise((resolve) => {
      filedb.readFile('no-file', (error, file) => {
        expect(error).to.exist;
        resolve();
      });
    }));

    return Promise.all(readPromises);
  });

  it('storeFile', function () {
    // store files
    const storePromises = [];
    sampleFilesToStore.forEach((file) => {
      storePromises.push(new Promise((resolve) => {
        //console.log(file);
        filedb.storeFile(file, (error) => {
          expect(error).to.not.exist;

          const newFilePath = path.join(filedbPath, `${file.sha1}.gz`);
          expect(fs.exists(newFilePath));

          resolve();
        });
      }));
    });

    return Promise.all(storePromises);
  });
});
