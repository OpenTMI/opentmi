/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components

// Third party components
const chai = require('chai');

// Application components
const Updater = require('../../../../app/tools/update/updater');
const Update = require('../../../../app/tools/update');

// Variables
const expect = chai.expect;


describe('update/index.js', function () {
  describe('exports', function () {
    it('should export valid GitUpdater class', function (done) {
      expect(Update.name).to.equal('GitUpdater');
      expect(Update.prototype instanceof Updater).to.equal(true, 'GitUpdater should inherit Updater class');
      done();
    });
  });
});
