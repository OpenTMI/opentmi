
/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , should = require('should')
  , request = require('supertest')
  , app = require('../server')
  , context = describe
  , User = mongoose.model('User')
  , Testcase = mongoose.model('Testcase')
  , agent = request.agent(app)

var count

/**
 * Articles tests
 */

describe('Testcases', function () {
  before(function (done) {
    // create a user
    var user = new User({
      email: 'foobar@example.com',
      name: 'Foo bar',
      username: 'foobar',
      password: 'foobar'
    })
    user.save(done)
  })

  describe('GET /testcase', function () {
    it('should respond with Content-Type text/html', function (done) {
      agent
      .get('/testcase')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(/Testcases/)
      .end(done)
    })
  })

  describe('GET /testcases/new', function () {
    context('When not logged in', function () {
      it('should redirect to /login', function (done) {
        agent
        .get('/testcases/new')
        .expect('Content-Type', /plain/)
        .expect(302)
        .expect('Location', '/login')
        .expect(/Moved Temporarily/)
        .end(done)
      })
    })

    context('When logged in', function () {
      before(function (done) {
        // login the user
        agent
        .post('/users/session')
        .field('email', 'foobar@example.com')
        .field('password', 'foobar')
        .end(done)
      })

      it('should respond with Content-Type text/html', function (done) {
        agent
        .get('/testcase/new')
        .expect('Content-Type', /html/)
        .expect(200)
        .expect(/New Article/)
        .end(done)
      })
    })
  })

  describe('POST /testcase', function () {
    context('When not logged in', function () {
      it('should redirect to /login', function (done) {
        request(app)
        .get('/testcases/new')
        .expect('Content-Type', /plain/)
        .expect(302)
        .expect('Location', '/login')
        .expect(/Moved Temporarily/)
        .end(done)
      })
    })

    context('When logged in', function () {
      before(function (done) {
        // login the user
        agent
        .post('/users/session')
        .field('email', 'foobar@example.com')
        .field('password', 'foobar')
        .end(done)
      })

      describe('Invalid parameters', function () {
        before(function (done) {
          Testcase.count(function (err, cnt) {
            count = cnt
            done()
          })
        })

        it('should respond with error', function (done) {
          agent
          .post('/testcase')
          .field('title', '')
          .field('body', 'foo')
          .expect('Content-Type', /html/)
          .expect(200)
          .expect(/Testcase title cannot be blank/)
          .end(done)
        })

        it('should not save to the database', function (done) {
          Testcase.count(function (err, cnt) {
            count.should.equal(cnt)
            done()
          })
        })
      })

      describe('Valid parameters', function () {
        before(function (done) {
          Testcase.count(function (err, cnt) {
            count = cnt
            done()
          })
        })

        it('should redirect to the new testcase page', function (done) {
          agent
          .post('/testcase')
          .field('title', 'foo')
          .field('body', 'bar')
          .expect('Content-Type', /plain/)
          .expect('Location', /\/testcase\//)
          .expect(302)
          .expect(/Moved Temporarily/)
          .end(done)
        })

        it('should insert a record to the database', function (done) {
          Testcase.count(function (err, cnt) {
            cnt.should.equal(count + 1)
            done()
          })
        })

        it('should save the testcase to the database', function (done) {
          Testcase
          .findOne({ title: 'foo'})
          .populate('user')
          .exec(function (err, testcase) {
            should.not.exist(err)
            testcase.should.be.an.instanceOf(Testcase)
            testcase.title.should.equal('foo')
            testcase.body.should.equal('bar')
            testcase.user.email.should.equal('foobar@example.com')
            testcase.user.name.should.equal('Foo bar')
            done()
          })
        })
      })
    })
  })

  after(function (done) {
    require('./helper').clearDb(done)
  })
})
