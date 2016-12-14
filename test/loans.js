var superagent = require("superagent"),
    dookie = require("dookie");
    chai = require("chai"),

    expect = chai.expect,
    mongoose = require('mongoose'),
    should = require('should');

var api = 'http://localhost:3000/api/v0'
var mongodbUri = 'mongodb://localhost/opentmi_dev';

var test_loan_id;
var test_loanitem_id;
var test_item_id = '582c7948850f298a5acff991';

var valid_loan_id = '582d81d64306a86032e6bea1';
var valid_loan_body = {
  loan_date : new Date(),
  loaner : '5825bb7cfe7545132c88c777',                  
  items : [
   {item : test_item_id},
   {item : test_item_id},
   {item : test_item_id} ]
};

describe('Loans', function () {
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
 
  it('should return ALL loans on /loans GET', function (done) {
    superagent.get(api+'/loans')
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).not.to.be.empty;
        expect(res.body).to.be.an('array');
        done();
      });
  });

  it('should return a SINGLE loan on /loans/<id> GET', function (done) {
	var expected_body = {
      _id : '582d81d64306a86032e6bea1',
      loan_date : new Date('2016-11-14T13:37:00+02:00'),
      loaner : '5825bb7cfe7545132c88c773',                  
      items : undefined
    }
    
    superagent.get(api + '/loans/' + valid_loan_id)
      .type('json')
      .end(function (e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, expected_body);
        
        // items is a complex structure and needs to be validated separately
        expect(res.body.items).to.be.an('array');
        expect(res.body.items[0]).to.have.property('_id');
        expect(res.body.items[0]).to.have.property('item');     
        
        done();
      });
  });
  
  it.skip('should not accept POST without items array', function(done) {
	var body = cloneObject(valid_loan_body);
	delete body.items;

	tryPost(400, body, undefined, done);
  });
  
  it.skip('should not accept POST with an empty items array', function(done) {
	var body = cloneObject(valid_loan_body);
	body.items = [];
	
    tryPost(400, body, undefined, done);
  });
 
  it('should not accept POST with item that does not have an item field', function(done) {
    var body = cloneObject(valid_loan_body);
	delete body.items[0].item;
	
    tryPost(400, body, undefined, done);
  });
  
  it ('should not accept POST with item that has an invalid item field', function(done) {
	var body = cloneObject(valid_loan_body);
	body.items[0].item = 'invalid_field';
	
    tryPost(400, body, undefined, done);
  });
  
  it('should accept and remove predefined return dates from a POST', function(done) {
	var body = cloneObject(valid_loan_body);
	body.items[0].return_date = new Date();
	
	superagent.post(api + '/loans')
      .send(body)
      .end(function(e, res) {
	    expectResult(200, res, undefined);
	    
	    superagent.get(api + '/loans/' + res.body._id)
	      .type('json')
	      .end(function(e, res) {
			expect(e).to.equal(null);
			expect(res.status).to.equal(200);
			expect(res.body.items[0]).to.not.have.property('return_date');
			done();
		  });
      });	 
  });
  
  it('should add a SINGLE loan on /loans POST', function (done) {
    var body = valid_loan_body;
    var expected_body = cloneObject(valid_loan_body);
    expected_body.items = undefined; // arrays cannot be compared automatically

    superagent.post(api + '/loans')
      .send(body)
      .end(function(e, res) {
        //console.log(res.body);
        expect(e).to.equal(null);
        expectResult(200, res, expected_body); 
        
        // Save _id for later use
        test_loan_id = res.body._id;
        test_loanitem_id = res.body.items[0]._id;
        
        // Make sure the loan is created
        superagent.get(api + '/loans/' + test_loan_id)
          .type('json')
          .end(function(e, res) {
		    expect(e).to.equal(null);
		    expectResult(200, res, expected_body);
		    
		    // Validate created items
            valid_loan_body.items[0]._id = res.body.items[0]._id;
            valid_loan_body.items[1]._id = res.body.items[1]._id;
            valid_loan_body.items[2]._id = res.body.items[2]._id;
        
		    done();
		  });
      });
  }); 
    
  it('should decrease item availability on POST', function(done) {
    var expected_body = { available : 4 }
    superagent.get(api + '/items/' + test_item_id)
      .type('json')
      .end(function(e, res) {
		expect(e).to.equal(null);
		// Should decrease 6 from what is in the seeds(after 2 successful loans of 3)
		expectResult(200, res, expected_body);
	 	done(); 
	  });
  });
    
  it('should not accept item without _id field when adding return_date to item on PUT', function(done) {
	var body = { items : cloneObject(valid_loan_body.items) }
	delete body.items[0]._id;
	body.items.pop();
	
    superagent.put(api + '/loans/' + test_loan_id)
      .send(body)
      .end(function(e, res) {
	    expect(e).to.not.equal(null);
        expectResult(400, res, undefined);
        done();
    });
  });
  
  it ('should not accept return PUT with invalid return_date', function(done) {
    var body = { items : cloneObject(valid_loan_body.items) }
	body.items[0].return_date = 'invalid date';
	
	superagent.put(api + '/loans/' + test_loan_id)
      .send(body)
      .end(function (e, res) {
	    expect(e).to.not.equal(null);
        expectResult(400, res, undefined);
        done();
      });
  });
  
  it ('should accept return PUT with valid return_date', function(done) {
    var test_date = new Date();
    var body = { items : cloneObject(valid_loan_body.items) }
    body.items[1].return_date = test_date;
	
	var expected_body = cloneObject(valid_loan_body);
	expected_body.items = undefined;
	
	superagent.put(api + '/loans/' + test_loan_id)
      .send(body)
      .end(function(e, res) {
	    expect(e).to.equal(null);
        expectResult(200, res, expected_body);
        done();
      });
  });
  
  it('should update a SINGLE item on /loans/<id> PUT', function (done) {
    var test_date = new Date();
    var body = { 'loan_date' : test_date };
            
    var expected_body = cloneObject(valid_loan_body);
    expected_body.items = undefined;
    expected_body.loan_date = test_date;
 
    var loan_route = api + '/loans/' + test_loan_id;
    superagent.put(loan_route)
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, undefined);
        
        superagent.get(loan_route)
          .type('json')
          .end(function(e, res) {
			expect(e).to.equal(null);
			expectResult(200, res, expected_body);	
			done();
	      });
      });
  });
  
  it('should increase item availability on PUT', function(done) {   // Should be after the relevant put
    var expected_body = { available : 5 };
    superagent.get(api + '/items/' + test_item_id)
      .type('json')
      .end(function(e, res) {
		expect(e).to.equal(null);
		expectResult(200, res, expected_body); // Should increase 1 from last loan
        done();
	  });
  });
  
  // Should be the second last test for loans
  it('should delete a SINGLE loan on /loans/<id> DELETE', function (done) {
    var loan_route = api + '/loans/' + test_loan_id;
    superagent.del(loan_route)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, undefined);
   
        // Make sure loan is deleted
        superagent.get(loan_route)
          .type('json')
          .end(function(e, res) {
			expect(e).to.not.equal(null);
            expectResult(404, res, undefined);
			done(); 
		  });
      });
  });
  
  // Make sure items availability changed on delete
  it('should increase availablity on deleted item for all unreturned items', function(done) {
	var expected_body = { available:7 }
	
	superagent.get(api + '/items/' + test_item_id)
	  .end(function(e, res) {
		expect(e).to.equal(null);
		expectResult(200, res, expected_body);
		done();  
	  });
  });
});

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function tryPost(expected_status, body, expection, next) {
  superagent.post(api + '/loans')
    .send(body)
    .end(function(e, res) {
	  expectResult(expected_status, res, expection);
      next();
    });
}

// Expect a certain status with a certain body
function expectResult(target_status, res, target_body) {
  res.should.be.json;
  
  if (res.status === 300) { 
    console.log('Test error, 300 multiple choices points to an unclean DB');
    process.exit(1);
  }
  
  expect(res.status).to.equal(target_status);
  
  if (typeof target_body === 'object') {
	// If we received multiple objects, check them all
	if (res.body instanceof Array) {
	  for (var i = 0; i < res.body.length; i++) {
	    expectToEqual(res.body[i], target_body, false); 
	  }
    }
	else if (typeof res.body === 'object') {
      expectToEqual(res.body, target_body, false);
    }
  }
}

// Checks that current has all keys(values too if defined) of target
// strict makes sure undefined values are required
function expectToEqual(current, target, strict) {
  if (typeof strict === 'undefined') { strict = false; }
	
  if (typeof target !== 'object') {
  	console.log('Test error, cannot fetch keys from target:' + (typeof target) + ', ' + target);
	process.exit(1);
  }

  for (var key in target) {
	// Check existance
	expect(current).to.have.property(key);
	
	// Check equality
	if (target[key] instanceof Date) {
	  expect((new Date(current[key])).getTime()).to.equal(target[key].getTime()); 
	}
	else if (typeof target[key] !== 'undefined' || strict) { 
	  expect(current[key]).to.equal(target[key]); 
	}
  } 
}
