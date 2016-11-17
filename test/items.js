
var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

var api = "http://localhost:3000/api/v0"

describe("Items", function () {

  var item_categories = ['accessory', 'board', 'component', 'other'];

  it("should return ALL items on /items GET", function(done){
    superagent.get(api+"/items")
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(e).to.equal(null);
        expect(res.body).not.to.be.empty;
        expect(res.body).to.be.an('array');
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

  // POSTed item used for PUT and DELETE tests, so save _id
  var new_item_id;
  it("should add a SINGLE item on /items POST", function (done) {
	  var date = new Date();
    var body = {
        barcode: "00000000099",
        name: "item 99",
        text_description: "This is a test item.",
        external_reference: "http://img.pandawhale.com/104933-dickbutt-meme-Imgur-dick-butt-yfgk.png",
        in_stock: 666,
        available: 25,
        date_created: date,
        category: "component"
    };
    superagent.post(api+'/items')
      .send(body)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.have.property('_id');
        new_item_id = res.body._id;
        expect(res.body.barcode).to.eql("00000000099");
        expect(res.body.name).to.eql("item 99");
        expect(res.body.text_description).to.eql("This is a test item.");
        expect(res.body.in_stock).to.eql(666);
        expect(res.body.category).to.be.oneOf(item_categories);
        expect(new Date(res.body.date_created).getTime()).to.equal(date.getTime());
        done();
      });
  });

  it("should update a SINGLE item on /items/<id> PUT", function (done) {
    var body = {
        available: 20
    };
    superagent.put(api + '/items/' + new_item_id)
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

    superagent.get(api + "/items/" + new_item_id)
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
        expect(res.body.available).to.eql(20);
        expect(res.body.category).to.be.oneOf(item_categories);
        done();
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

