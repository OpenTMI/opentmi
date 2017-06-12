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

var item_id_loaned = '582c7948850f298a5acff981';
var new_item_id;
var valid_post_body = {
  barcode:'9876543210',
  name:'test item',
  text_description:'This is a test item.',
  external_reference:'https://suprtickets.com/blog/wp-content/uploads/2015/11/Rick-Astley-UK-Tour-Dates-2016.jpg',
  in_stock:30,
  available:25,
  date_created:new Date('2016-11-12T17:11:28+02:00'), // This is an object so cloned objects will refer to the same date, be careful
  category:'component'
};
var error_body = { error:undefined };

describe('Items', function () {
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
  
  it('should return a list with a SINGLE item on /items?<name> GET', function (done) {
    var expected_body = {
      _id : '582c7948850f298a5acff981',
      barcode : '012345678901',
      name : 'Seeeduino-Arch',
      image_src: 'https://developer.mbed.org/media/cache/platforms/Arch_V1.1.jpg.250x250_q85.jpg',
      text_description: 'Seeeduino Arch from Seeed Studio is an mbed enabled development board which combines some advantages of mbed and Arduino. Arch is based on NXP LPC11U24 with Arduino form factor and Grove connectors. Building a prototype is easy with lots of Shield and Grove modules.',
      external_reference : 'https://developer.mbed.org/platforms/Seeeduino-Arch/',
      in_stock : 20,
      available: 19,
      date_created : new Date('2016-11-12T17:11:28+02:00'),
      category : 'board'
	  };
  
    superagent.get(api + '/items?name=Seeeduino-Arch')
      .set('authorization', auth_string)
      .type('json')
      .end(function(e, res) { 
        expect(e).to.equal(null);
        expect(res.body).to.be.an('array');
        expect(res.body).not.to.be.empty;
        expect(res.body).to.have.lengthOf(1);
        res.body = res.body[0];
        expectResult(res, 200, expected_body);
        done();
      });     
  });
 
  it('should return an image from /items/id/image', function(done) {
	  superagent.get(api + '/items' + '/582c7948850f298a5acff981' + '/image')
	    .set('authorization', auth_string)
	    .type('json')
	    .end(function(e, res) {
        expect(e).to.equal(null);
        expect(res.status).to.equal(200);
        expect(res.get('Content-Type')).to.equal('image/jpeg');
        done();
	    });
  });
 
  it('should not accept POST that has more available than in_stock', function(done) {
	  // Copy a valid body and make it invalid
	  var body = Object.assign({}, valid_post_body);
	  body.available = body.in_stock + 1;
	
    superagent.post(api + '/items')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {  
		    expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();
	    });
  });
  
  it('should not accept POST that has negative available', function(done) {
	  var body = Object.assign({}, valid_post_body);
	  body.available = -1;
	
	  superagent.post(api + '/items')
	    .set('authorization', auth_string)
	    .send(body)
	    .end(function(e, res) {
		    expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();  
	    });
  });
  
  it('should not accept POST that has negative available', function(done) {
	  var body = Object.assign({}, valid_post_body);
	  body.in_stock = -1;

	  superagent.post(api + '/items')
	    .set('authorization', auth_string)
	    .send(body)
	    .end(function(e, res) {
		    expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();  
	    });
  });
 
  it ('should not accept positive available without in_stock', function(done) {
	  // Copy a valid body and remove in_stock field from it
	  var body = Object.assign({}, valid_post_body);
	  delete body.in_stock;
	
    superagent.post(api + '/items')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {  
		    expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();
	    });
  });

  // POST item and save _id because it is used for PUT and DELETE tests
  it('should add a SINGLE item on /items POST', function(done) {
	  // Copy a valid body
    var body = Object.assign({}, valid_post_body);
    
    // Expect to receive same body back, we can use original object here because we are not going to modify it
    var expected_body = valid_post_body;
 
    superagent.post(api + '/items')
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, expected_body);

        // Save id of this item for further testing purposes
        new_item_id = res.body._id;
        
        superagent.get(api+'/items/'+new_item_id)
          .set('authorization', auth_string)
	       .type('json')
	       .end(function(e, res) {
			     expect(e).to.equal(null);
			     done();
		     });
      });
  });
  
  it('should not accept post that has a barcode that is already in the database', function(done) {
	 var body = Object.assign({}, valid_post_body);	 
	 body.barcode = '9876543210';
	 
	 superagent.post(api + '/items')
	   .set('authorization', auth_string)
	   .send(body)
	   .end(function(e, res) {
		   expect(e).to.not.equal(null);
		   expectResult(res, 400, { error:undefined });
		   done();
	   });  
  });

  it('should not accept PUT with a negative available', function(done) {
	  var body = { available: -1 };

    superagent.put(api + '/items/' + new_item_id.toString())
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {  
		    //expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();
	    });
  });
  
  it('should not accept PUT with a negative in_stock', function(done) {
	  var body = { in_stock: -1 }

    superagent.put(api + '/items/' + new_item_id.toString())
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {  
		    expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();
	    });
  });
  
  it('should not accept PUT with an in_stock that would cause available to be negative', function(done) {
	  var body = { in_stock: 0 };

    superagent.put(api + '/items/' + new_item_id)
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {  
		    expect(e).to.not.equal(null);
		    expectResult(res, 400, error_body);
		    done();
	    });
  });

  it('should update a SINGLE item on /items/<id> PUT, with just available field', function (done) {
    var body = { available: 10 };
    var expected_body = Object.assign({}, valid_post_body);
    expected_body.in_stock = 15;
    expected_body.available = 10;
    
    superagent.put(api + '/items/' + new_item_id.toString())
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, undefined);
        
		    // Check up call to make sure changes occured
		    superagent.get(api + '/items/' + new_item_id.toString())
		      .set('authorization', auth_string)
          .type('json')
          .end(function(e, res) {
            expect(e).to.equal(null);
            expectResult(res, 200, expected_body);
            done();
          });	
      });   
  });
  
  it('should update a SINGLE item on /items/<id> PUT, with just in_stock field', function (done) {
    var body = { in_stock: 20 };
    var expected_body = Object.assign({}, valid_post_body);
    expected_body.in_stock = 20;
    expected_body.available = 15;
    
    superagent.put(api + '/items/' + new_item_id.toString())
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
		    expect(e).to.equal(null);
		    expectResult(res, 200, undefined);
		
        // Make sure item is really updated
	      superagent.get(api + '/items/' + new_item_id.toString())
	        .set('authorization', auth_string)
          .type('json')
          .end(function (e, res) {
			      expect(e).to.equal(null);
			      expectResult(res, 200, expected_body);
			      done();
	        });		  
      });
  });

  it('should update a SINGLE item on /items/<id> PUT, with both in_stock and available', function (done) {
    var body = {
	    available: 20,
      in_stock: 20
    };
    var expected_body = Object.assign({}, valid_post_body);
    expected_body.in_stock = 20;
    expected_body.available = 20;
    
    var item_route = api + '/items/' + new_item_id.toString(); 
    superagent.put(item_route)
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, undefined);
        
		    // Make sure item is really updated
		    superagent.get(item_route)
		      .set('authorization', auth_string)
          .type('json')
          .end(function (e, res) {
			      expect(e).to.equal(null);
			      expectResult(res, 200, expected_body);
			      done();
		      });
      });
  });
  
  it('should update all field values on a normal PUT', function(done) {
	  var body = {
      barcode: '9876543991',
      name: 'real item',
      text_description: 'This was a test item.',
      external_reference: 'https://suprtickets.com/blog/wp-content/uploads/2015/11/Rick-Astley-UK-Tour-Dates-2015.jpg',
      in_stock: 15,
      available: 10,
      date_created: new Date('2012-11-12T17:11:28+02:00'), // This is an object so cloned objects will refer to the same date, be careful
      category: 'other'
    };
    
    superagent.put(api + '/items/' + new_item_id.toString())
      .set('authorization', auth_string)
      .send(body)
      .end(function(e, res) {
	    expect(e).to.equal(null);
	    expectResult(res, 200, undefined);
	    
	    // Check up call to make sure changes occured
	    superagent.get(api + '/items/' + new_item_id.toString())
	      .set('authorization', auth_string)
	      .type('json')
	      .end(function(e, res) {
			    expect(e).to.equal(null);
			    expectResult(res, 200, body);
			    done();
		    });
	   });
  });
  
  it('should delete a SINGLE item on /items/<id> DELETE', function (done) {
    var item_path = api + '/items/' + new_item_id;
    superagent.del(item_path)
      .set('authorization', auth_string)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, undefined);
        
        // Make sure item is deleted
        superagent.get(item_path)
          .set('authorization', auth_string)
          .end(function(e, res) { 
		        expect(e).to.not.equal(null);
		        expectResult(res, 404, undefined);
		        done();
          });
      });
  });
  
  it('should not delete item that is loaned somewhere', function(done) {
    superagent.del(api + '/items/' + item_id_loaned)
      .set('authorization', auth_string)
      .end(function(e, res) {
	      expect(e).to.not.equal(null);
	      expectResult(res, 400, undefined); 
	      done();
	  });
  });
});

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