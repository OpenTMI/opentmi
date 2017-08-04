/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const logger = require('winston');

// Local components
const SchemaController = require('../../../app/controllers/schemas');
const MockResponse = require('../mocking/MockResponse');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;
const controller = new SchemaController();

describe('controllers/schemas.js', function () {
  describe('paramCollection', function () {
    beforeEach(function (done) {
      controller.schemas = {
        collection1: 'data1',
        collection2: 'data2',
        collection3: 'data3',
        collection4: 'data4'
      };
      done();
    });

    // Param collection is supposed to define Schema key for request
    it('paramCollection - should set Schema of req', function (done) {
      const req = {};

      controller.paramCollection(req, undefined, () => {
        expect(req).to.have.property('Schema', 'data2');
        done();
      }, 'collection2');
    });

    // Unknown collection name should result in 404
    it('paramCollection - unknown collection name', function (done) {
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error', 'No schema found with name: nonsense collection');
        done();
      }, (value) => {
        expect(value).to.equal(404);
      });

      controller.paramCollection(undefined, res, () => {
        done(new Error('Should not pass request forward when no such collection exists.'));
      }, 'nonsense collection');
    });
  });


  describe('get', function () {
    const schemaNames = ['name1', 'name2', 'name3', 'name4'];

    beforeEach(function (done) {
      controller.schemaNames = schemaNames;
      done();
    });

    it('get - should return the schemaNames defined in the controller', function (done) {
      const res = new MockResponse((value) => {
        expect(value).to.deep.equal(schemaNames);
        done();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.get(undefined, res);
    });
  });


  describe('find', function () {
    const collection = 'aCollection';
    const schemaData = {schema: 'schema data', properties: 'schema properties'};

    // Should return the property Schema from request
    it('find - should return schema data', function (done) {
      const req = {
        params: {Collection: collection},
        Schema: schemaData
      };
      const res = new MockResponse((value) => {
        expect(value).to.have.property('collection', collection);
        expect(value).to.have.deep.property('schema', schemaData.schema);
        expect(value).to.have.deep.property('properties', schemaData.properties);

        done();
      }, (value) => {
        expect(value).to.equal(200);
      });

      SchemaController.find(req, res);
    });

    // Should throw error when no params defined
    it('find - no request params', function (done) {
      const req = {
        Schema: 'not object'
      };
      const res = new MockResponse();

      expect(SchemaController.find.bind(this, req, res)).to.throw(Error);
      done();
    });

    // Should throw error when no Schema defined, trying to access properties from undefined object
    it('find - no Schema', function (done) {
      const req = {
        params: {Collection: collection}
      };
      const res = new MockResponse();

      expect(SchemaController.find.bind(this, req, res)).to.throw(Error);
      done();
    });
  });
});
