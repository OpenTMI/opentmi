var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

describe("Index", function () {
  it("get api v0", function (done) {
    superagent.get("http://localhost:3000/api/v0")
      .end(function (e, res) {
        console.log(e);
        //(e === null).should.equal(true);
        res.text.should.equal("API v0");
        done();
      });
  });
});