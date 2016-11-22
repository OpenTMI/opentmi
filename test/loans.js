
var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    mongoose = require("mongoose"),
    should = require("should");

var api = "http://localhost:3000/api/v0"

describe("Loans", function () {
  var first_loan_id;
  it("should return ALL loans on /loans GET", function (done) {
    superagent.get(api+"/loans")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).not.to.be.empty;
        expect(res.body).to.be.an('array');
        first_loan_id = res.body[0]["_id"].toString();
        done();
      })

    });

  it("should return a SINGLE loan on /loans/<id> GET", function (done) {
    superagent.get(api + "/loans" + "?_id=" + first_loan_id)
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
        expect(item_data).to.have.property('loaner');
        expect(item_data).to.have.property('items');
        expect(item_data.items).to.be.an('array');
        expect(item_data.items[0]).to.have.property('item');
        expect(item_data).to.have.property('loan_date');
        done();
      });
  });

  var new_loan_id;
  it("should add a SINGLE loan on /loans POST", function (done) {
	  var date = new Date();
    var body = {
      "loan_date" : date,
      "loaner" : "5825bb7cfe7545132c88c777",                  
      "items" : 
        [
          {"item" : "582c7948850f298a5acff983"}
        ]
    };

    superagent.post(api+'/loans')
      .send(body)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        done();
      });
  }); 
  
  // FIXME
  it.skip("should update a SINGLE item on /loans/<id> PUT", function (done) {    
    superagent.put(api + '/loans/' + new_item_id)
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
  });

  // In normal use loans are not deleted (in order to maintain loan history)
  // Add this when core features work
  it("should delete a SINGLE loan on /loans/<id> DELETE");
});
