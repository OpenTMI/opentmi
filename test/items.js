var superagent = require("superagent"),
    dookie = require("dookie");
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");
    mongoose = require("mongoose");

var api = 'http://localhost:3000/api/v0';
var mongodbUri = 'mongodb://localhost/opentmi_dev';

var new_item_id;
var valid_post_body = {
  barcode: '9876543210',
  name: 'test item',
  text_description: 'This is a test item.',
  external_reference: 'https://suprtickets.com/blog/wp-content/uploads/2015/11/Rick-Astley-UK-Tour-Dates-2016.jpg',
  in_stock: 30,
  available: 25,
  date_created: new Date('2016-11-12T17:11:28+02:00'), // This is an object so cloned objects will refer to the same date, be careful
  category: 'component'
}

describe('Items', function () {
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
 
  var item_categories = ['accessory', 'board', 'component', 'other'];
  
  it('should return ALL items on /items GET', function(done){
    superagent.get(api+'/items')
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.be.an('array');
        expect(res.body).not.to.be.empty;
        expect(res.body).to.have.lengthOf(14);  
        done();
      })
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
	}
  
    superagent.get(api + '/items?name=Seeeduino-Arch')
      .type('json')
      .end(function (e, res) { 
        expect(e).to.equal(null);
        expect(res.body).to.be.an('array');
        expect(res.body).not.to.be.empty;
        expect(res.body).to.have.lengthOf(1);
        expectResult(200, res, expected_body);
        done();
      });     
  });
 
  it('should not accept POST that has more available than in_stock', function(done) {
	// Copy a valid body and make it invalid
	var body = Object.assign({}, valid_post_body);
	body.available = body.in_stock + 1;
	
    var expected_body = { error : undefined	}
    
    superagent.post(api + '/items')
      .send(body)
      .end(function(e, res) {  
		expect(e).to.not.equal(null);
		expectResult(400, res, expected_body);
		done();
	  });
  });
  
  it ('should not accept non-zero available without in_stock', function(done) {
	// Copy a valid body and remove in_stock field from it
	var body = Object.assign({}, valid_post_body);
	delete body.in_stock;
	
	// We expect to receive an error with a message
    var expected_body = { error : undefined }
    
    superagent.post(api + '/items')
      .send(body)
      .end(function(e, res) {  
		expect(e).to.not.equal(null);
		expectResult(400, res, expected_body);
		done();
	  });
  });

  // POST item and save _id because it is used for PUT and DELETE tests
  it('should add a SINGLE item on /items POST', function (done) {
	// Copy a valid body
    var body = Object.assign({}, valid_post_body);
    
    // Expect to receive same body back, we can use original object here because we are not going to modify it
    var expected_body = valid_post_body;
 
    superagent.post(api + '/items')
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, expected_body);

        // Save id of this item for further testing purposes
        new_item_id = res.body._id;
        
        done();
      });
  });

  it('should not accept PUT with a negative available', function(done) {
	var body = { available: -1 }
	var expected_body = { error : undefined }
	
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {  
		//expect(e).to.not.equal(null);
		expectResult(400, res, expected_body);
		done();
	  });
  });
  
  it('should not accept PUT with a negative in_stock', function(done) {
	var body = { in_stock: -1 }
	var expected_body = { error : undefined }
	
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {  
		expect(e).to.not.equal(null);
		expectResult(400, res, expected_body);
		done();
	  });
  });
  
  it('should not accept PUT with an in_stock that would cause available to be negative', function(done) {
	var body = { in_stock: 4 }
	var expected_body = { error : undefined }
	
    superagent.put(api + '/items/' + new_item_id)
      .send(body)
      .end(function(e, res) {  
		expect(e).to.not.equal(null);
		expectResult(400, res, expected_body);
		done();
	  });
  });


  it('should update a SINGLE item on /items/<id> PUT, with just available field', function (done) {
    var body = { available: 10 }
    var expected_body = Object.assign({}, valid_post_body);
    expected_body.in_stock = 15;
    expected_body.available = 10;
    
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, undefined);
        
		// Check up call to make sure changes occured
		superagent.get(api + '/items/' + new_item_id.toString())
          .type('json')
          .end(function (e, res) {
            expect(e).to.equal(null);
            expectResult(200, res, expected_body);
            done();
          });	
      });   
  });
  
  
  it('should update a SINGLE item on /items/<id> PUT, with just in_stock field', function (done) {
    var body = { in_stock: 20 }
    var expected_body = Object.assign({}, valid_post_body);
    expected_body.in_stock = 20;
    expected_body.available = 15;
    
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
		expect(e).to.equal(null);
		expectResult(200, res, undefined);
		
        // Make sure item is really updated
	    superagent.get(api + '/items/' + new_item_id.toString())
          .type('json')
          .end(function (e, res) {
			expect(e).to.equal(null);
			expectResult(200, res, expected_body);
			done();
	      });		  
      });
  });

  it('should update a SINGLE item on /items/<id> PUT, with both in_stock and available', function (done) {
    var body = {
	  available: 20,
      in_stock: 20
    }
    var expected_body = Object.assign({}, valid_post_body);
    expected_body.in_stock = 20;
    expected_body.available = 20;
    
    var item_route = api + '/items/' + new_item_id.toString(); 
    superagent.put(item_route)
      .send(body)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, undefined);
        
		// Make sure item is really updated
		superagent.get(item_route)
          .type('json')
          .end(function (e, res) {
			expect(e).to.equal(null);
			expectResult(200, res, expected_body);
			done();
		  });
      });
  });
  
  it('should delete a SINGLE item on /items/<id> DELETE', function (done) {
    var item_path = api + '/items/' + new_item_id;
    superagent.del(item_path)
      .end(function(e, res) {
        expect(e).to.equal(null);
        expectResult(200, res, undefined);
        
        // Make sure item is deleted
        superagent.get(item_path)
          .end(function(e, res) { 
		    expect(e).to.not.equal(null);
		    expectResult(404, res, undefined);
		    done();
          });
      });
  });
});

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
// strict makes sure undefined values are not skipped
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
