
var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

var api = "http://localhost:3000/api/v0"

describe("Loans", function () {
 
  it("should return ALL loans on /loans GET", function (done) {
    superagent.get(api+"/loans")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).not.to.be.empty;
        expect(res.body).to.be.an('array');
        single_loan = res.body[0];
        done();
      })

    });
/*
  it("should return a SINGLE loan on /loans/<id> GET", function (done) {
    superagent.get(api + "/loans" + "?_id=" + loan_id)
      .type('json')
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.have.lengthOf(1);

        var item_data = res.body[0];
        expect(item_data).to.have.property('_id');
        expect(item_data).to.have.property('count');
        expect(item_data.count).to.be.at.least(1);
        expect(item_data).to.have.property('date_loaned');
        expect(item_data).to.have.property('loaner');
        expect(item_data).to.have.property('loaned_item');
        
        done();
      });
  });
*/
    
  it("should add a SINGLE loan on /loans POST");
    
  it("should update a SINGLE item on /loans/<id> PUT");

  // In normal use loans are not deleted (in order to maintain loan history)
  // Add this when core features work
  it("should delete a SINGLE loan on /loans/<id> DELETE");
});
