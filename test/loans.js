
var superagent = require("superagent"),
    dookie = require("dookie");
    co = require("co");
    chai = require("chai"),
    expect = chai.expect,
    mongoose = require("mongoose"),
    should = require("should");

var test_item_id = "582c7948850f298a5acff983";
var test_date = new Date();

var api = "http://localhost:3000/api/v0"
var mongodbUri = 'mongodb://localhost/opentmi_dev';

describe("Loans", function () {

  // Create fresh DB
  before(function(done) {
    this.timeout(5000);
    const fs = require('fs');
    const file_contents = fs.readFileSync('./seeds/dummy_db.json', 'utf8')
    const data = JSON.parse(file_contents);
    dookie.push(mongodbUri, data).then(function() {
      done();
    });
  });

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

  it("should not accept POST without items array", function(done) {
	var body = {  loan_date : test_date,
                  loaner    : "5825bb7cfe7545132c88c773"
               }
	
	superagent.post(api + '/loans')
      .send(body)
      .end(function (e, res) {
        res.should.be.json;
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        expect(res.body).to.have.property('error')
        done();
      });
  });
  
  it("should not accept POST with an empty items array", function(done) {
	var body = { loan_date : test_date,
                 loaner    : "5825bb7cfe7545132c88c773",
                 items     : [] }
	
	superagent.post(api + '/loans')
      .send(body)
      .end(function (e, res) {
        res.should.be.json;
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        expect(res.body).to.have.property('error')
        done();
      });
  });
  
  it("should not accept POST with item that does not have an 'item' field", function(done) {
	var body = {  loan_date : test_date,
                  loaner    : "5825bb7cfe7545132c88c773",
                  items : [{"_id": "582c7948850f298a5acff002"}]
               }
               
    superagent.post(api+'/loans')
      .send(body)
      .end(function (e, res) {
		res.should.be.json;
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		expect(res.body).to.have.property('error');
		done();
      });
  });
  it ("should not accept POST with item that has an invalid 'item' field", function(done) {
	var body = {
      "_id" : new_loan_id,
      "loan_date" : test_date,
      "loaner" : "5825bb7cfe7545132c88c777",                  
      "items" : [
        {"_id": "582c7948850f298a5acff002",
         "item" : "invalid_item_id"},   
        {"_id": "582c7948850f298a5acff003",
         "item" : "invalid_item_id"} ]
    }
    
    superagent.post(api + "/loans")
      .send(body)
      .end(function (e, res) {
		 res.should.be.json;
		 expect(res.status).to.equal(400);
		 expect(e).to.not.equal(null);
		 done();
	  });
  });
  
  it("should not accept POST with item that has a predefined return date", function(done) {
	var body = {  
		"_id" : new_loan_id,
		"loan_date" : test_date,
        "loaner"    : "5825bb7cfe7545132c88c773",
        "items" : [{
		  "_id":"582c7948850f298a5acff002",
		  "item" : test_item_id,
		  "return_date":test_date }]
    } 
               
    superagent.post(api + "/loans")
      .send(body)
      .end(function (e, res) {
		res.should.be.json;
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		expect(res.body).to.have.property('error');
		done();
      });
  });
  
  var new_loan_id;
  it("should add a SINGLE loan on /loans POST", function (done) {
    new_loan_id = mongoose.Types.ObjectId();
    var body = {
      "_id" : new_loan_id,
      "loan_date" : test_date,
      "loaner" : "5825bb7cfe7545132c88c777",                  
      "items" : 
        [
          {"_id": "582c7948850f298a5acff002",
           "item" : test_item_id},
          {"_id": "582c7948850f298a5acff003",
           "item" : test_item_id}
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
  it("should decrease item availability on POST", function(done) { // Should be run after a succesfull POST
    superagent.get(api + "/items/" + test_item_id)
      .type("json")
      .end(function(e, res) {
		res.should.be.json;
		expect(res.status).to.equal(200);
		expect(e).to.equal(null);
		expect(res.body).to.have.property('available');
		expect(res.body.available).to.equal(0); // Should decrease 2 from what is in the seeds 
		done(); 
	  });
  });
    
  it ("should not accept PUT with invalid return_date in item", function(done) {
	var body = { "items" : [{
	  "_id": "582c7948850f298a5acff002",
      "item" : test_item_id,
      "return_date" : "invalid_date" }]
    }
	 
	superagent.put(api + "/loans/" + new_loan_id)
	  .send(body)
	  .end(function(e, res) {
		res.should.be.json;
		if ( res.status == 300 ) {
		  console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        done();
	  }); 
  });
  
  it('should not accept PUT with missing item field in item', function(done) {
	var body = { "items" : [{
	  "_id": "582c7948850f298a5acff002",
      "return_date" : test_date }]
    }
	
	superagent.put(api + '/loans/' + new_loan_id.toString())
      .send(body)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        done();
      }); 
  });
  it("should not accept PUT with invalid item field in item", function(done) {
    var body = { "items" : [{
	  "_id": "582c7948850f298a5acff002",
      "item" : "invalid_item_id",
      "return_date" : test_date }]
    }
    
    superagent.put(api + "/loans/" + new_loan_id.toString())
      .send(body)
      .end(function (e, res) {
	    res.should.be.json;	  
	    if ( res.status == 300 ) {
		  console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        done();
    });
  });
  
  it("should not accept PUT with missing _id field in item", function(done) {
	var date = new Date();
	var body = { "items" : [{
	  "item":test_item_id,
      "return_date": test_date }]
    }
	
	superagent.put(api + "/loans/" + new_loan_id.toString())
      .send(body)
      .end(function (e, res) {
        res.should.be.json;
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        done();
      }); 
  }); 
  it("should not accept PUT with invalid _id in item", function(done) {
    var body = { "items" : [{
      "_id": "582c7948850",
      "item" : test_item_id,
      "return_date" : test_date }]
    }
    
    superagent.put(api + "/loans/" + new_loan_id.toString())
      .send(body)
      .end(function (e, res) {
	    res.should.be.json;	  
	    if ( res.status == 300 ) {
		  console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(400);
        expect(e).to.not.equal(null);
        done();
    });
  });  
  
  it("should update a SINGLE item on /loans/<id> PUT", function (done) {
    var body = { "items" : [{
	  "_id": "582c7948850f298a5acff002",
      "item" : test_item_id,
      "return_date" : test_date }]
    }
    superagent.put(api + '/loans/' + new_loan_id.toString())
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
  it("should increase item availability on PUT", function(done) {   // Should be after the relevant put
    superagent.get(api + "/items/" + test_item_id)
      .type("json")
      .end(function(e, res) {
        res.should.be.json;
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('available');
        expect(res.body.available).to.equal(1); // Should increase 1 from what is in the seeds
        done();
	  });
  });
  
  // Should be the last test for loans
  it("should delete a SINGLE loan on /loans/<id> DELETE", function (done) {
    superagent.del(api + "/loans/" + new_loan_id)
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
});
