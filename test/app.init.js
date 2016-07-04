var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

var api = "http://localhost:3000/api/v0"

describe("Index", function () {
  it("get api v0", function (done) {
    superagent.get(api)
      .end(function (e, res) {
        res.should.be.json
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({"apiVersion":"v0"});
        done();
      });
  });
  it("get testcases", function(done){
    superagent.get(api+"/testcases")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array)
        done();
      })
  });
  it("get campaigns", function(done){
    superagent.get(api+"/campaigns")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array)
        done();
      })
  });
  it("get resources", function(done){
    superagent.get(api+"/resources")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array)
        done();
      })
  });
  it("get results", function(done){
    superagent.get(api+"/results")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array)
        done();
      })
  });
  it("get builds", function(done){
    superagent.get(api+"/duts/builds")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array)
        done();
      })
  });
  it("get users", function(done){
    superagent.get(api+'/users')
    .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        res.body.should.be.instanceof(Array)
        done();
      })
  })
});