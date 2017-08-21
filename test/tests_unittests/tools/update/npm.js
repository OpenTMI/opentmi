/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components

// Third party components
const chai = require('chai');

// Application components
// const Updater = require('../../../../app/tools/update/updater');
const Npm = require('../../../../app/tools/update/npm');

// Variables
const expect = chai.expect;
let npm;

describe('update/npm.js', function () {
  describe('exports', function () {
    it('should be a class named Npm', function (done) {
      expect(Npm.name).to.equal('Npm');
      done();
    });

    it('should define intended functions', function (done) {
      npm = new Npm();
      expect(npm.list).to.exist; // npm instance should define list function;
      expect(npm.install).to.exist; // npm instance should define install function;
      done();
    });
  });

  describe('Npm', function () {
    const execOptions = {key1: 10, key2: '50a', key3: () => 92};

    describe('list', function () {
      it('should execute a command with specified options', function () {
        npm = new Npm((command, options) => {
          expect(command).to.equal('npm list --json --depth=0 --prod');
          expect(options).to.deep.equal(Object.assign({}, {maxBuffer: 1024 * 1024}, execOptions));
          return Promise.resolve('{"key1":"value1","key2":"value2"}');
        });

        return expect(npm.list(execOptions)).to.eventually.deep.equal(
          {key1: 'value1', key2: 'value2'});
      });

      it('should be rejected when execute fails', function () {
        npm = new Npm(() => Promise.reject(new Error('Mock Error from test')));
        return expect(npm.list(execOptions)).to.be.rejectedWith(Error, 'npm list failed: ');
      });
    });

    describe('install', function () {
      it('should execute a command with specified options - default install options', function () {
        npm = new Npm((command, options) => {
          expect(command).to.equal('npm install --on-optional --only=production');
          expect(options).to.deep.equal(execOptions);
          return Promise.resolve('{"key1":"value1","key2":"value2"}');
        });

        npm.list = (options) => {
          expect(options).to.deep.equal(execOptions);
          return Promise.resolve('Test finished, good job!');
        };

        return expect(npm.install(execOptions)).to.eventually.equal('Test finished, good job!');
      });

      it('should execute a command with specified options - custom install options', function () {
        npm = new Npm((command, options) => {
          expect(command).to.equal('npm install CUSTOM_OPTIONS');
          expect(options).to.deep.equal(execOptions);
          return Promise.resolve('{"key1":"value1","key2":"value2"}');
        });

        npm.list = (options) => {
          expect(options).to.deep.equal(execOptions);
          return Promise.resolve('Test finished, splendid job!');
        };

        return expect(npm.install(execOptions, 'CUSTOM_OPTIONS')).to.eventually.equal('Test finished, splendid job!');
      });

      it('should catch error thrown in exec', function () {
        npm = new Npm(() => Promise.reject(new Error('install ERROR')));
        return expect(npm.install(execOptions)).to.be.rejectedWith(Error, 'npm install failed: install ERROR');
      });
    });
  });
});
