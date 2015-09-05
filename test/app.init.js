var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

var api = "http://localhost:3000/api/v0"

describe("Index", function () {
  it("get api v0", function (done) {
    superagent.get(api)
      .end(function (e, res) {
        console.log(e);
        //(e === null).should.equal(true);
        res.text.should.equal("API v0");
        done();
      });
  });
  it("get testcases", function(done){
    superagent.get(api+"/testcases")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        done();
      })
  });
  it("get campaigns", function(done){
    superagent.get(api+"/campaigns")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        done();
      })
  });
  it("get resources", function(done){
    superagent.get(api+"/resources")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        done();
      })
  });
  it("get results", function(done){
    superagent.get(api+"/results")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        done();
      })
  });
  it("get builds", function(done){
    superagent.get(api+"/builds")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        done();
      })
  });
});