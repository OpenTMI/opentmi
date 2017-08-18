/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');

// Test variables
const expect = chai.expect;
const Event = require('../../../../app/tools/eventBus/event');

describe('eventBus/event.js', function () {
  describe('exports', function () {
    it('should expose Event class', function (done) {
      expect(Event.name).to.equal('Event');
      done();
    });
  });

  describe('Event', function () {
    const validEventBody = [
      ['data1', 'data2'],
      'eventti',
      'event',
      {metaKey: 'value'}
    ];

    describe('constructor', function () {
      it('should create an event with valid parameters', function (done) {
        const event = new Event(...validEventBody);

        expect(event).to.have.property('name', 'eventti');
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.deep.property('data', ['data1', 'data2']);
        expect(event).to.have.deep.property('meta', {metaKey: 'value'});

        done();
      });

      it('should throw error when type is not valid', function (done) {
        // Disfigure constructor params
        const brokenEventBody = [...validEventBody];
        brokenEventBody[2] = 'noEvent';

        try {
          // Try to create event with broken params
          const event = new Event(...brokenEventBody); // eslint-disable-line no-unused-vars
          done(new Error('This constructor should throw an error.'));
        } catch (error) {
          expect(error).to.have.property('message',
            'Invalid type of event: noEvent, expected one of: [message,event,log].');
          done();
        }
      });

      it('should throw error when meta is not an object', function (done) {
        // Disfigure constructor params
        const brokenEventBody = [...validEventBody];
        brokenEventBody[3] = 96263; // Something not object

        try {
          // Try to create event with broken params
          const event = new Event(...brokenEventBody); // eslint-disable-line no-unused-vars
          done(new Error('This constructor should throw an error.'));
        } catch (error) {
          expect(error).to.have.property('message',
            'Invalid type for meta: number, expected object.');
          done();
        }
      });
    });

    describe('toString', function () {
      it('should format data as intended', function (done) {
        const event = new Event(...validEventBody);
        const line = event.toString();

        expect(line).to.equal('[event] eventti({"metaKey":"value"}): ["data1","data2"].');
        done();
      });
    });

    describe('toJSON', function () {
      it('should return object with all the fields from Event class', function (done) {
        const event = new Event(...validEventBody);
        const json = event.toJSON();

        expect(json).to.have.property('name', 'eventti');
        expect(json).to.have.property('type', 'event');
        expect(json).to.have.deep.property('data', ['data1', 'data2']);
        expect(json).to.have.deep.property('meta', {metaKey: 'value'});

        done();
      });
    });

    describe('fromObject', function () {
      it('should create a new event from valid object', function (done) {
        const validObject = {
          data: validEventBody[0],
          name: validEventBody[1],
          type: validEventBody[2],
          meta: validEventBody[3]
        };

        const event = Event.fromObject(validObject);

        expect(event).to.have.property('name', 'eventti');
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.deep.property('data', ['data1', 'data2']);
        expect(event).to.have.deep.property('meta', {metaKey: 'value'});

        done();
      });

      it('should throw error when type is not valid', function (done) {
        const validObject = {
          data: validEventBody[0],
          name: validEventBody[1],
          type: 'noEvent',
          meta: validEventBody[3]
        };

        try {
          const event = Event.fromObject(validObject); // eslint-disable-line no-unused-vars
          done();
        } catch (error) {
          expect(error).to.have.property('message',
            'Invalid type of event: noEvent, expected one of: [message,event,log].');
          done();
        }
      });

      it('should throw error when meta is not an object', function (done) {
        const validObject = {
          data: validEventBody[0],
          name: validEventBody[1],
          type: validEventBody[2],
          meta: 734552
        };

        try {
          const event = Event.fromObject(validObject); // eslint-disable-line no-unused-vars
          done();
        } catch (error) {
          expect(error).to.have.property('message',
            'Invalid type for meta: number, expected object.');
          done();
        }
      });
    });
  });
});
