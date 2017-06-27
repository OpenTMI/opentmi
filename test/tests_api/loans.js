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

var test_loan_id;
var test_loanitem_id;
var test_item_id = '582c7948850f298a5acff991';

var valid_loan_id = '582d81d64306a86032e6bea1';
var valid_loan_body = {
  loan_date:new Date(),
  loaner:'5825bb7cfe7545132c88c777',                  
  items:[
    { item:test_item_id },
    { item:test_item_id },
    { item:test_item_id } ]
};
var error_body = { error : undefined };

describe('Loans', function () {
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

  it('should return a SINGLE loan on /loans/<id> GET', function (done) {
	  var expected_body = {
      _id : '582d81d64306a86032e6bea1',
      loan_date : new Date('2016-11-14T13:37:00+02:00'),
      loaner : '5825bb7cfe7545132c88c773',                  
      items : undefined
    };
    
    superagent.get(api + '/loans/' + valid_loan_id)
      .set('authorization', auth_string)
      .type('json')
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, expected_body);
        
        // items is a complex structure and needs to be validated separately
        expect(res.body.items).to.be.an('array');
        expect(res.body.items[0]).to.have.property('_id');
        expect(res.body.items[0]).to.have.property('item');     
        
        done();
      });
  });
  
  it('should not accept POST without items array', function(done) {
	  var body = cloneObject(valid_loan_body);
	  delete body.items;

    superagent.post(api + '/loans')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expectResult(res, 400, error_body);
        done();
    });
  });
  
  it('should not accept POST with an empty items array', function(done) {
	  var body = cloneObject(valid_loan_body);
	  body.items = [];
	
    superagent.post(api + '/loans')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expectResult(res, 400, error_body);
        done();
    });
  });
 
  it('should not accept POST with item that does not have an item field', function(done) {
    var body = cloneObject(valid_loan_body);
	  delete body.items[0].item;
	
    superagent.post(api + '/loans')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expectResult(res, 400, error_body);
        done();
    });
  });
  
  it('should not accept POST with item that has an invalid item field', function(done) {
	  var body = cloneObject(valid_loan_body);
	  body.items[0].item = 'invalid_field';
	
    superagent.post(api + '/loans')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expectResult(res, 400, error_body);
        done();
      });
  });
  
  it('should accept and remove predefined return dates from a POST', function(done) {
	  var body = cloneObject(valid_loan_body);
	  body.items[0].return_date = new Date();
	
	  superagent.post(api + '/loans')
	    .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expectResult(res, 200, undefined);
	    
        // Make sure the item indeed was not returned
	      superagent.get(api + '/loans/' + res.body._id)
	        .set('authorization', auth_string)
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
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
        //console.log(res.body);
        expect(e).to.equal(null);
        expectResult(res, 200, expected_body); 
        
        // Save _id for later use
        test_loan_id = res.body._id;
        test_loanitem_id = res.body.items[0]._id;
        
        // Make sure the loan is created
        superagent.get(api + '/loans/' + test_loan_id)
          .set('authorization', auth_string)
          .type('json')
          .end(function(e, res) {
		        expect(e).to.equal(null);
		        expectResult(res, 200, expected_body);
		    
		        // Validate created items
            valid_loan_body.items[0]._id = res.body.items[0]._id;
            valid_loan_body.items[1]._id = res.body.items[1]._id;
            valid_loan_body.items[2]._id = res.body.items[2]._id;
        
		        done();
		      });
      });
  }); 
    
  it('should decrease item availability on POST', function(done) {
    var expected_body = { available : 4 };
    superagent.get(api + '/items/' + test_item_id)
      .set('authorization', auth_string)
      .type('json')
      .end(function(e, res) {
		    expect(e).to.equal(null);
		    // Should decrease 6 from what is in the seeds(after 2 successful loans of 3)
		    expectResult(res, 200, expected_body);
	 	    done(); 
	  });
  });
    
  it('should not accept item without _id field when adding return_date to item on PUT', function(done) {
	  var body = { items : cloneObject(valid_loan_body.items) };
	  delete body.items[0]._id;
	  body.items.pop();
	
    superagent.put(api + '/loans/' + test_loan_id)
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expect(e).to.not.equal(null);
        expectResult(res, 400, undefined);
        done();
      });
  });
  
  it ('should not accept return PUT with invalid return_date', function(done) {
    var body = { items : cloneObject(valid_loan_body.items) };
	  body.items[0].return_date = 'invalid date';
	
	  superagent.put(api + '/loans/' + test_loan_id)
	    .set('authorization', auth_string)
      .send(body)
      .end(function (e, res) {
	      expect(e).to.not.equal(null);
        expectResult(res, 400, undefined);
        done();
      });
  });
  
  it ('should accept return PUT with valid return_date', function(done) {
    var test_date = new Date();
    var body = { items : cloneObject(valid_loan_body.items) };
    body.items[1].return_date = test_date;
	
	  var expected_body = cloneObject(valid_loan_body);
	  expected_body.items = undefined;
	
	  superagent.put(api + '/loans/' + test_loan_id)
	    .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	      expect(e).to.equal(null);
        expectResult(res, 200, expected_body);
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
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, undefined);
        
        superagent.get(loan_route)
          .set('authorization', auth_string)
          .type('json')
          .end(function(e, res) {
			expect(e).to.equal(null);
			expectResult(res, 200, expected_body);	
			done();
	      });
      });
  });
  
  it('should increase item availability on PUT', function(done) {   // Should be after the relevant put
    var expected_body = { available : 5 };

    superagent.get(api + '/items/' + test_item_id)
      .set('authorization', auth_string)
      .type('json')
      .end(function(e, res) {
		    expect(e).to.equal(null);
		    expectResult(res, 200, expected_body); // Should increase 1 from last loan
        done();
	    });
  });
  
  // Should be the second last test for loans
  it('should delete a SINGLE loan on /loans/<id> DELETE', function (done) {
    var loan_route = api + '/loans/' + test_loan_id;
    superagent.del(loan_route)
      .set('authorization', auth_string)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, undefined);
   
        // Make sure loan is deleted
        superagent.get(loan_route)
          .set('authorization', auth_string)
          .type('json')
          .end(function(e, res) {
			      expect(e).to.not.equal(null);
            expectResult(res, 404, undefined);
			      done(); 
		      });
      });
  });
  
  // Make sure items availability changed on delete
  it('should increase availablity on deleted item for all unreturned items', function(done) {
	  var expected_body = { available:7 };
	
	  superagent.get(api + '/items/' + test_item_id)
	    .set('authorization', auth_string)
	    .end(function(e, res) {
		    expect(e).to.equal(null);
		    expectResult(res, 200, expected_body);
		    done();  
	    });
   });
});

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Short cut for expect a certain status with a certain body
function expectResult(res, target_status, target_body) {
  if (!(target_body instanceof Object) && target_body !== undefined) {
    console.log('Test error, checks for non-object target bodies is not yet implemented');
    process.exit(1);
  }
  
  res.should.be.json;

  if (res.status === 300) {
    console.log('Test error, 300 multiple choices points to an unclean DB');
    process.exit(1); 
  }

  expect(res.status).to.equal(target_status);

  if (target_body !== undefined) {
    expect(res.body).to.be.instanceof(Object);
    expectObjectsToEqual(JSON.parse(JSON.stringify(res.body)), target_body);
  }
}

// Wrap around for testing equality of two values, includes support for dates
function expectObjectsToEqual(body_a, body_b) {
  for (var key in body_b) {
    expect(body_a).to.have.property(key);
    if (body_b[key] instanceof Date) {
      expect((new Date(body_a[key])).getTime()).to.equal(body_b[key].getTime()); 
    }
    else if (body_b[key] !== undefined) {
      expect(body_a[key]).to.equal(body_b[key]);
    }
  }
}
