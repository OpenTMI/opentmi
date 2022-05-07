/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const {expect} = require('chai');

// Application components
const NpmUpdater = require('../../../../app/tools/update/npmUpdater');

// Variables
let npmUpdater;

describe('update/npmUpdater.js', function () {
  describe('exports', function () {
    it('should expose a class with name NpmUpdater', function (done) {
      expect(NpmUpdater.name).to.equal('NpmUpdater');
      done();
    });
  });

  describe('NpmUpdater', function () {
    describe.skip('_update', function () {

    });

    describe('version', function () {
      it('should call super version', function () {
        npmUpdater = new NpmUpdater();

        Object.getPrototypeOf(npmUpdater).version = () => Promise.resolve('SuperVersionResolved');

        return expect(npmUpdater.version()).to.eventually.equal('SuperVersionResolved');
      });
    });
  });
});
