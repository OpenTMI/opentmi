/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const {expect} = require('chai');

// Application components
const Npm = require('../../../../app/tools/update/npm');
const Updater = require('../../../../app/tools/update/updater');

// Variables
let updater;

describe('update/updater.js', function () {
  describe('exports', function () {
    it('should expose a class with name Updater', function (done) {
      expect(Updater.name).to.equal('Updater');
      done();
    });
  });

  describe('Updater', function () {
    describe('constructor', function () {
      it('should define intended properties', function (done) {
        updater = new Updater();

        expect(updater).to.have.property('_options');
        expect(updater._options).to.have.keys(['cwd', 'env']);

        expect(updater).to.have.property('_pending');
        expect(updater._pending).to.have.property('then');

        expect(updater).to.have.property('npm');
        expect(updater.npm).to.be.instanceof(Npm);

        done();
      });

      it('should assign options from constructor properties', function (done) {
        updater = new Updater('CWDD', {ENV: 'ENVV'});

        expect(updater).to.have.property('_options');
        expect(updater._options).to.have.property('cwd', 'CWDD');
        expect(updater._options).to.have.property('env');
        expect(updater._options.env).to.have.property('ENV', 'ENVV');

        expect(updater).to.have.deep.property('_pending');
        expect(updater._pending).to.have.property('then');

        expect(updater).to.have.property('npm');
        expect(updater.npm).to.be.instanceof(Npm);

        done();
      });
    });

    describe('update', function () {
      it('should reject update request when _pending has status pending', function () {
        updater = new Updater();

        updater._pending = {isPending: () => true};
        return expect(updater.update()).to.be.rejectedWith(Error, 'Cannot update, pending action exists.');
      });

      it('should call functions in the right order with right parameters', function () {
        updater = new Updater();

        let versionCalled = false;
        updater.version = () => {
          versionCalled = true;
          return Promise.resolve('TestVersion');
        };

        let updateCalled = false;
        updater._update = (version) => {
          updateCalled = true;
          expect(version).to.equal('TestRevision');
          return Promise.resolve();
        };

        updater._revert = () => {
          throw Error('No need to call revert, everything should work.');
        };

        const updatePromise = updater.update('TestRevision')
          .then(() => {
            expect(versionCalled).to.equal(true, 'update should include a call to version.');
            expect(updateCalled).to.equal(true, 'update should include a call to _update');
            return Promise.resolve('TestFinished');
          });

        return expect(updatePromise).to.eventually.equal('TestFinished');
      });

      it('should call _revert when update fails', function () {
        updater = new Updater();

        let versionCalled = false;
        updater.version = () => {
          versionCalled = true;
          return Promise.resolve('TestRevertVersion');
        };

        let updateCalled = false;
        updater._update = (version) => {
          updateCalled = true;
          expect(version).to.equal('TestRevision');
          return Promise.reject(new Error('FakeUpdateError'));
        };

        let revertCalled = false;
        updater._revert = (version) => {
          revertCalled = true;
          expect(version).to.equal('TestRevertVersion');
          return Promise.resolve();
        };

        const updatePromise = updater.update('TestRevision');
        return expect(updatePromise).to.be.rejectedWith(
          Error,
          /Update failed: error: FakeUpdateError[\s\S]*reverted back to version/
        )
          .then(() => {
            expect(versionCalled).to.equal(true, 'version should be called in a failing update case');
            expect(updateCalled).to.equal(true, '_update should be called in a failing update case');
            expect(revertCalled).to.equal(true, 'Revert should be called when update fails');
            return Promise.resolve();
          });
      });

      it('should raise correct error when _revert fails', function () {
        updater = new Updater();

        let versionCalled = false;
        updater.version = () => {
          versionCalled = true;
          return Promise.resolve('TestRevertVersion');
        };

        let updateCalled = false;
        updater._update = (version) => {
          updateCalled = true;
          expect(version).to.equal('TestRevision');
          return Promise.reject(new Error('MockUpdateError'));
        };

        let revertCalled = false;
        updater._revert = (version) => {
          revertCalled = true;
          expect(version).to.equal('TestRevertVersion');
          return Promise.reject(new Error('revertError'));
        };

        const updatePromise = updater.update('TestRevision');
        return expect(updatePromise).to.be.rejectedWith(
          Error,
          /Update failed: error: MockUpdateError[\s\S]*failed to revert back[\s\S]*revertError/
        )
          .then(() => {
            expect(versionCalled).to.equal(true, 'version should be called in a failing update case');
            expect(updateCalled).to.equal(true, '_update should be called in a failing update case');
            expect(revertCalled).to.equal(true, 'Revert should be called when update fails');
            return Promise.resolve();
          });
      });
    });

    describe.skip('_update', function () {

    });

    describe.skip('_revert', function () {

    });

    describe('version', function () {
      it('should return the result of npm.list', function () {
        updater = new Updater('CWDD', {ENV: 'ENVV'});

        updater.npm.list = (options) => {
          expect(options).to.have.property('cwd', 'CWDD');
          expect(options).to.have.property('env');
          expect(options.env).to.have.property('ENV', 'ENVV');
          return Promise.resolve({data: 'NpmListData'});
        };
        updater.npm.version = () => Promise.resolve({});

        return expect(updater.version(true)).to.eventually.deep.equal({data: 'NpmListData'});
      });

      it('should return rejected Promise when _pending is pending', function () {
        updater = new Updater();

        updater._pending = {isPending: () => true};
        updater.npm.list = () => Promise.reject(new Error('Should not call npm.list.'));

        return expect(updater.version()).to.be.rejectedWith('Cannot fetch version, pending action exists.');
      });
    });

    describe.skip('restart', function () {

    });
  });
});
