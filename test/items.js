
var superagent = require("superagent"),
    dookie = require("dookie");
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");
    mongoose = require("mongoose");

var api = "http://localhost:3000/api/v0";
var mongodbUri = 'mongodb://localhost/opentmi_dev';

var new_item_id;

describe("Items", function () {
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

  it("should return ALL items on /items GET", function(done){
    superagent.get(api+"/items")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.be.an('array');
        expect(res.body).not.to.be.empty;
        done();
      })
  });
  
  it("should return a SINGLE item on /items?<name> GET", function (done) {
    superagent.get(api + "/items" + "?name=Seeeduino-Arch")
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
        //TODO: take properties straight from model
        expect(item_data).to.have.property('_id');
        expect(item_data).to.have.property('barcode')
        expect(item_data).to.have.property('name')
        expect(item_data).to.have.property('text_description');
        expect(item_data).to.have.property('in_stock');
        expect(item_data).to.have.property('available');
        expect(item_data).to.have.property('date_created');
        expect(item_data).to.have.property('category');
        expect(item_data.category).to.be.oneOf(item_categories);
        done();
      });
  });

  it("should not accept POST that has more available than in_stock", function(done) {
	var body = {
      barcode: "00000000099",
      name: "item 99",
      text_description: "This is a test item.",
      external_reference: 'http://img.pandawhale.com/104933-dickbutt-meme-Imgur-dick-butt-yfgk.png',
      in_stock: 24,
      available: 25,
      date_created: new Date(),
      category: 'component'
    }
    
    superagent.post(api + '/items')
      .send(body)
      .end(function(e, res) {
	    res.should.be.json;	
	    if(res.status === 300) {
          console.log('seems that your DB is not clean!');
          process.exit(1);
        }  
        expect(res.status).to.equal(400);
	    expect(e).to.not.equal(null);
	    done();
	});
  });
  it ('should not accept available without in_stock', function(done) {
	var body = {
      barcode: '00000000099',
      name: 'item 99',
      text_description: 'This is a test item.',
      external_reference: 'http://img.pandawhale.com/104933-dickbutt-meme-Imgur-dick-butt-yfgk.png',
      available: 25,
      date_created: new Date(),
      category: 'component'
    }
    
    superagent.post(api + '/items')
      .send(body)
      .end(function(e, res) {
	    res.should.be.json;
	    if (res.status === 300) {
		  console.log('seems that your DB is not clean!');
          process.exit(1);
		}
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		done();	  
	});
  });
  it ('should not accept in_stock without available', function(done) {
	var body = {
      barcode: '00000000099',
      name: 'item 99',
      text_description: 'This is a test item.',
      external_reference: 'http://img.pandawhale.com/104933-dickbutt-meme-Imgur-dick-butt-yfgk.png',
      in_stock: 24,
      date_created: new Date(),
      category: 'component'
    }
    
    superagent.post(api + '/items')
      .send(body)
      .end(function(e, res) {
	    res.should.be.json;
	    if (res.status === 300) {
		  console.log('seems that your DB is not clean!');
          process.exit(1);
		}
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		done();	  
	});
  });

  // POSTed item used for PUT and DELETE tests, so save _id
  it("should add a SINGLE item on /items POST", function (done) {
	var date = new Date();
    var body = {
        barcode: "00000000099",
        name: "item 99",
        text_description: "This is a test item.",
        external_reference: "http://img.pandawhale.com/104933-dickbutt-meme-Imgur-dick-butt-yfgk.png",
        in_stock: 30,
        available: 25,
        date_created: date,
        category: "component"
    }
    
    superagent.post(api + "/items")
      .send(body)
      .end(function(e, res) {
        res.should.be.json;
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.have.property('_id');
        expect(res.body.barcode).to.eql("00000000099");
        expect(res.body.name).to.eql("item 99");
        expect(res.body.text_description).to.eql("This is a test item.");
        expect(res.body.in_stock).to.eql(30);
        expect(res.body.category).to.be.oneOf(item_categories);
        expect(new Date(res.body.date_created).getTime()).to.equal(date.getTime());
        new_item_id = res.body._id;
        done();
      });
  });

  it("should not accept PUT with a negative available", function(done) {
	var body = { available: -1 }
    superagent.put(api + "/items/" + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
        res.should.be.json;
        if (res.status === 300) {
		  console.log("seems that your DB is not clean!");
		  process.exit(1);
		}  
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		done();
	  });
  });
  it("should not accept PUT with a negative in_stock", function(done) {
	var body = { in_stock: -1 }
    superagent.put(api + "/items/" + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
        res.should.be.json;
        if (res.status === 300) {
		  console.log("seems that your DB is not clean!");
		  process.exit(1);
		}  
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		done();
	  });
  });
 it("should not accept PUT with a in_stock that would cause available to be negative", function(done) {
	var body = { in_stock: 4 }
    superagent.put(api + "/items/" + new_item_id)
      .send(body)
      .end(function(e, res) {
        res.should.be.json;
        if (res.status === 300) {
		  console.log("seems that your DB is not clean!");
		  process.exit(1);
		}  
		expect(res.status).to.equal(400);
		expect(e).to.not.equal(null);
		done();
	  });
  });

  it("should update a SINGLE item on /items/<id> PUT, with just available field", function (done) {
    var body = { available: 10 }
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
        res.should.be.json
        if (res.status === 300) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        
        // Check up call to make sure changes occured
        superagent.get(api + "/items/" + new_item_id.toString())
          .type('json')
          .end(function (e, res) {
            res.should.be.json
            if( res.status === 300 ) {
              console.log("seems that your DB is not clean!");
              process.exit(1);
            }
            expect(res.body).to.have.property('_id');
            expect(res.body).to.have.property('barcode')
            expect(res.body).to.have.property('name')
            expect(res.body).to.have.property('text_description');
            expect(res.body).to.have.property('in_stock');
            expect(res.body).to.have.property('available');
            expect(res.body.in_stock).to.equal(15);
            expect(res.body.available).to.equal(10);
            expect(res.body.category).to.be.oneOf(item_categories);
            done();
          });
      });   
  });

  it("should update a SINGLE item on /items/<id> PUT, with just in_stock field", function (done) {
    var body = { in_stock: 20 }
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
        res.should.be.json
        if (res.status === 300) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
      });

    superagent.get(api + "/items/" + new_item_id.toString())
      .type('json')
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.body).to.have.property('_id');
        expect(res.body).to.have.property('barcode')
        expect(res.body).to.have.property('name')
        expect(res.body).to.have.property('text_description');
        expect(res.body).to.have.property('in_stock');
        expect(res.body).to.have.property('available');
        expect(res.body.category).to.be.oneOf(item_categories);
        done();
      });
  });

  it("should update a SINGLE item on /items/<id> PUT, with both in_stock and available", function (done) {
    var body = {
		available: 20,
        in_stock: 20
    };
    superagent.put(api + '/items/' + new_item_id.toString())
      .send(body)
      .end(function(e, res) {
        res.should.be.json
        if (res.status === 300) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        
        superagent.get(api + "/items/" + new_item_id.toString())
          .type('json')
          .end(function (e, res) {
            res.should.be.json
            if( res.status === 300 ) {
              console.log("seems that your DB is not clean!");
              process.exit(1);
            }
            expect(res.body).to.have.property('_id');
            expect(res.body).to.have.property('barcode')
            expect(res.body).to.have.property('name')
            expect(res.body).to.have.property('text_description');
            expect(res.body).to.have.property('in_stock');
            expect(res.body).to.have.property('available');
            expect(res.body.in_stock).to.equal(20);
            expect(res.body.available).to.equal(20);
            expect(res.body.category).to.be.oneOf(item_categories);
            done();
          });
      });
  });
  it("should delete a SINGLE item on /items/<id> DELETE", function (done) {
    superagent.del(api + "/items/" + new_item_id)
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

