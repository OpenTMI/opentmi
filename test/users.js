
var superagent = require("superagent"),
    dookie = require("dookie");
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

// var userSchema = require('mongoose').model('User').schema;
var api = "http://localhost:3000/api/v0";
var mongodbUri = 'mongodb://localhost/opentmi_dev';

describe("Users", function () {

  /* Create fresh DB
  before(function(done) {
    this.timeout(5000);
    const fs = require('fs');
    const file_contents = fs.readFileSync('./seeds/dummy_db.json', 'utf8')
    const data = JSON.parse(file_contents);
    dookie.push(mongodbUri, data).then(function() {
      done();
    });
  });
  */
  
  var single_user;
  it("should return ALL users on /users GET", function(done){
    superagent.get(api+"/users")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.be.an('array');
        expect(res.body).not.to.be.empty;
        single_user = res.body.pop();
        done();
      })
  });
  
  var new_user_id;
  it("should add a SINGLE user on /users POST", function (done) {
    var body = {
        "name": "Test User",
        "email": "testuser@fakemail.se",
        "displayName": "Tester",
        "apikeys":[],
        "groups":[]
    };
    superagent.post(api+'/users')
      .send(body)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(201);
        expect(e).to.equal(null);
        expect(res.body).to.have.property('_id');
        new_user_id = res.body._id;
        expect(res.body.name).to.eql("Test User");
        expect(res.body.email).to.eql("testuser@fakemail.se");
        expect(res.body.displayName).to.eql("Tester");
        expect(res.body).to.have.ownProperty("apikeys");
        expect(res.body).to.have.ownProperty("groups");
        expect(res.body).to.have.ownProperty("loggedIn");
        expect(res.body).to.have.ownProperty("lastVisited");
        expect(res.body).to.have.ownProperty("registered");
        done();
      });
  });

  it("should return a SINGLE user on /users/<id> GET", function (done) {
    superagent.get(api + "/users/" + new_user_id)
      .type('json')
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);

        //TODO: take properties straight from model
        expect(res.body).to.have.property('_id');
        expect(res.body.name).to.eql("Test User");
        expect(res.body.email).to.eql("testuser@fakemail.se");
        expect(res.body.displayName).to.eql("Tester");
        expect(res.body).to.have.property('apikeys');
        expect(res.body).to.have.property('groups');
        expect(res.body).to.have.property('loggedIn');
        expect(res.body).to.have.property('lastVisited');
        expect(res.body).to.have.property('registered');
        done();
      });
  });

  it("should update a SINGLE user on /users/<id> PUT", function (done) {
    var body = {
        email: "newtestermail@fakemail.se"
    };
    superagent.put(api + '/users/' + new_user_id)
      .send(body)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
      });
    
    superagent.get(api + "/users/" + new_user_id)
      .type('json')
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.body).to.have.property('_id');
        expect(res.body.name).to.eql("Test User");
        expect(res.body.email).to.eql("newtestermail@fakemail.se");
        expect(res.body.displayName).to.eql("Tester");
        expect(res.body).to.have.property('apikeys');
        expect(res.body).to.have.property('groups');
        expect(res.body).to.have.property('loggedIn');
        expect(res.body).to.have.property('lastVisited');
        expect(res.body).to.have.property('registered');
        done();
      });
  });

  it("should delete a SINGLE user on /users/<id> DELETE", function (done) {
    superagent.del(api + "/users/" + new_user_id)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(204);
        expect(e).to.equal(null);
        done();
      });
  });
});

