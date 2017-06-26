var jwt_s = require('jwt-simple');
var nconf = require('nconf');
var moment = require('moment');

var superagent = require('superagent');
var should = require('should');
var chai = require('chai');
var expect = chai.expect;

var api = 'http://localhost:3000/api/v0';
var mongodbUri = 'mongodb://localhost/opentmi_dev';
var test_user_id = '5825bb7afe7545132c88c761';

describe('Basic Get API', function () {
  var auth_string;	

  // Create fresh DB
  before(function(done) {
    this.timeout(5000);
    
    // Initialize nconf
    nconf.argv({ cfg:{ default:'development' } })
         .env()
         .defaults(require('./../../config/config.js'));  
    
    // Create token for requests
    var payload = { sub:test_user_id,
		                group:'admins',
		                iat:moment().unix(), 
		                exp:moment().add(2, 'h').unix() 
    };
    var token = jwt_s.encode(payload, nconf.get('webtoken')); 
    auth_string = 'Bearer ' + token;
    done();
  });
	
  it('get api version', function(done) {
    superagent.get(api)
      .end(function (e, res) {
        res.should.be.json;
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({apiVersion:'v0'});
        expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get testcases', function(done) {
    superagent.get(api+'/testcases')
      .type('json')
      .end(function(e, res){
        res.should.be.json;
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get campaigns', function(done) {
    superagent.get(api+'/campaigns')
      .type('json')
      .end(function(e, res){
        res.should.be.json;
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get resources', function(done) {
    superagent.get(api + '/resources')
      .type('json')
      .end(function(e, res) {
        res.should.be.json;
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get results', function(done) {
    superagent.get(api + '/results')
      .type('json')
      .end(function(e, res) {
        res.should.be.json;
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get builds', function(done) {
    superagent.get(api + '/duts/builds')
      .type('json')
      .end(function(e, res) {
        res.should.be.json;
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        //expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get users', function(done) {
    superagent.get(api + '/users')
    .set('authorization', auth_string)
    .type('json')
      .end(function(e, res) {
        res.should.be.json;
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  })

  it('get items', function(done) {
    superagent.get(api + '/items')
      .set('authorization', auth_string)
      .type('json')
      .end(function(e, res) {
        res.should.be.json;
        expect(e).to.equal(null);
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });
  
  it('get loans', function(done) {
    superagent.get(api + '/loans')
      .set('authorization', auth_string)
      .type('json')
      .end(function(e, res) {
        res.should.be.json;
        res.status.should.equal(200);
        expect(e).to.equal(null);
        res.body.should.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });
});
