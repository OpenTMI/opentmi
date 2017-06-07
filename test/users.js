var jwt_s = require('jwt-simple');
var nconf = require('nconf');
var moment = require('moment');

var superagent = require('superagent');
var chai = require('chai');
var expect = chai.expect;
var should = require('should');

var user_with_loan_id = '5825bb7cfe7545132c88c773';

var api = 'http://localhost:3000/api/v0';
var mongodbUri = 'mongodb://localhost/opentmi_dev';
var test_user_id = '5825bb7afe7545132c88c761';

describe('Users', function () {
  var auth_string;	

  // Create fresh DB
  before(function(done) {
    this.timeout(5000);
    
    // Initialize nconf
    nconf.argv({ cfg:{ default:'development' } })
         .env()
         .defaults(require('./../config/config.js'));  
    
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
  
  var new_user_id;
  it('should add a SINGLE user on /users POST', function (done) {
    var body = {
      name:'Test User',
      email:'testuser@fakemail.se',
      displayName: 'Tester',
      apikeys:[],
      groups:[]
    };

    superagent.post(api+'/users')
      .set('authorization', auth_string)
      .send(body)
      .end(function (e, res) {
        res.should.be.json;
        if ( res.status === 300 ) {
          console.log('seems that your DB is not clean!');
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.have.property('_id');
        new_user_id = res.body._id;
        expect(res.body.name).to.eql(body.name);
        expect(res.body.email).to.eql(body.email);
        expect(res.body.displayName).to.eql(body.displayName);
        expect(res.body).to.have.ownProperty('apikeys');
        expect(res.body).to.have.ownProperty('groups');
        expect(res.body).to.have.ownProperty('loggedIn');
        expect(res.body).to.have.ownProperty('lastVisited');
        expect(res.body).to.have.ownProperty('registered');
        done();
      });
  });

  it('should return a SINGLE user on /users/<id> GET', function (done) {
    superagent.get(api + '/users/' + new_user_id)
      .set('authorization', auth_string)
      .type('json')
      .end(function (e, res) {
        res.should.be.json;
        if ( res.status === 300 ) {
          console.log('seems that your DB is not clean!');
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);

        //TODO: take properties straight from model
        expect(res.body).to.have.property('_id');
        expect(res.body.name).to.eql('Test User');
        expect(res.body.email).to.eql('testuser@fakemail.se');
        expect(res.body.displayName).to.eql('Tester');
        expect(res.body).to.have.property('apikeys');
        expect(res.body).to.have.property('groups');
        expect(res.body).to.have.property('loggedIn');
        expect(res.body).to.have.property('lastVisited');
        expect(res.body).to.have.property('registered');
        done();
      });
  });

  it('should update a SINGLE user on /users/<id> PUT', function (done) {
    var body = { email: 'newtestermail@fakemail.se' };

    superagent.put(api + '/users/' + new_user_id)
      .set('authorization', auth_string)
      .send(body)
      .end(function (e, res) {
        res.should.be.json;
        if (res.status === 300) {
          console.log('seems that your DB is not clean!');
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        
        superagent.get(api + '/users/' + new_user_id)
          .set('authorization', auth_string)
          .type('json')
          .end(function (e, res) {
            res.should.be.json;
            if (res.status === 300) {
              console.log('seems that your DB is not clean!');
              process.exit(1);
            }
            expect(res.body).to.have.property('_id');
            expect(res.body.name).to.eql('Test User');
            expect(res.body.email).to.eql('newtestermail@fakemail.se');
            expect(res.body.displayName).to.eql('Tester');
            expect(res.body).to.have.property('apikeys');
            expect(res.body).to.have.property('groups');
            expect(res.body).to.have.property('loggedIn');
            expect(res.body).to.have.property('lastVisited');
            expect(res.body).to.have.property('registered');
            done();
          });
      });
  });

  it('should not delete a user that is referenced in a loan', function(done) {
	  superagent.del(api + '/users/' + user_with_loan_id)
	    .set('authorization', auth_string)
	    .end(function(e, res) {
		    res.should.be.json;
		    expect(e).to.not.equal(null); 
		    expect(res.status).to.equal(400);
		    done();	 
	    });  
  });

  it('should delete a SINGLE user on /users/<id> DELETE', function (done) {
    superagent.del(api + '/users/' + new_user_id)
      .set('authorization', auth_string)
      .end(function(e, res) {
        res.should.be.json;
        if (res.status === 300) {
          console.log('seems that your DB is not clean!');
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        
        // Make sure the document is deleted
        superagent.get(api + '/users/' + new_user_id)
          .set('authorization', auth_string)
          .end(function(e, res) {
		        res.should.be.json
		        expect(e).to.not.equal(null);
		        expect(res.status).to.equal(404);
		        done();
		      });
      });
  });
});
