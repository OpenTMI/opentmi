var superagent = require("superagent"),
    chai = require("chai"),
    expect = chai.expect,
    should = require("should");

var api = "http://localhost:3000/api/v0"

describe("Resource", function () {
  var resource_id;
  it("add resource", function (done) {
    var body = {
      name: 'dev1',
      type: 'dut'
    };
    superagent.post(api+'/resources')
      .send(body)
      .end(function (e, res) {
        res.should.be.json
        if( res.status === 300 ) {
          console.log("seems that your DB is not clean!");
          process.exit(1);
        }
        expect(res.status).to.equal(200);
        expect(e).to.equal(null);
        expect(res.body).to.have.property('name')
        expect(res.body).to.have.property('type')
        expect(res.body).to.have.property('id');
        expect(res.body.name).to.equal('dev1');
        expect(res.body.type).to.equal('dut');
        resource_id = res.body.id;
        done();
      });
  });
  it("get resource", function(done){
    superagent.get(api+"/resources/"+resource_id)
      .type('json')
      .end( function(e, res){
        res.should.be.json
        res.status.should.equal(200);
        expect(res.body).to.have.property('name')
        expect(res.body).to.have.property('type')
        expect(res.body).to.have.property('id');
        expect(res.body.name).to.equal('dev1');
        expect(res.body.type).to.equal('dut');
        done();
      })
  });
  it("update resource", function (done) {
    var body = { "status.value": "active" };
    superagent.put(api+'/resources/'+resource_id)
      .send(body)
      .end(function (e, res) {
        res.should.be.json;
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('status');
        expect(res.body.status).to.have.property('value');
        expect(res.body.status.value).to.be.equal('active');
        done();
      });
  });
  it("remove resource", function (done) {
    superagent.delete(api+'/resources/'+resource_id).end(function (err, res) {
        res.should.be.json;
        expect(res.status).to.equal(200);
        resource_id = null;
        done();   
      });
  });
});