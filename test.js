const {Headers, Response, Request} = require('node-fetch');
const expect = require('chai').expect

require('./node_modules/rxrest/test/urlsearchparamspolyfill.js')
global.Headers = Headers
global.Response = Response
global.Request = Request
global.FormData = require('form-data')

const {RxRest, NewRxRest} = require('rxrest')
const rxrestInstance = new RxRest()

const rxrest = new NewRxRest()

const {RxRestAssert, RxRestAssertionError} = require('./lib/index.js')
const rxrestassert = new RxRestAssert()

describe('RxRestAssert', function() {

  before(function() {
    rxrestInstance.baseURL = 'localhost'
  })

  it('should get the correct result', function() {
    rxrestassert.expect('GET', 'foo').respond({foo: 'bar', id: 1})

    return rxrest.one('foo')
    .get()
    .observe(e => {
      expect(e.plain()).to.deep.equal({foo: 'bar', id: 1})
    })
  })

  it('should get the correct status result', function() {
    rxrestassert.expect('GET', 'foo').respond(500)

    let i = rxrestInstance.responseInterceptors.push(function(response) {
      expect(response.status).to.equal(500)
      expect(response.statusText).to.equal('Internal Server Error')
    })

    return rxrest.one('foo')
    .get()
    .observe(() => {})
    .then(e => {
      rxrestInstance.responseInterceptors.length--
    })
  })

  it('should fail because method is not GET', function() {
    rxrestassert.expect('GET', 'foo')

    return rxrest.one('foo')
    .post({foo: 'bar'})
    .observe(() => {})
    .then((d) => {
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e.message).to.equal('Method should be "GET", got "POST"')
    })
  })

  it('should fail because url is not /foo/', function() {
    rxrestassert.expect('GET', /foo/)

    return rxrest.one('bar')
    .get()
    .observe(() => {})
    .then((d) => {
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e.message).to.equal('URL should match "/foo/", got "bar"')
    })
  })

  it('should fail because url is not foo', function() {
    rxrestassert.expect('GET', 'foo')

    return rxrest.one('bar')
    .get()
    .observe(() => {})
    .then((d) => {
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e.message).to.equal('URL should be "foo", got "bar"')
    })
  })

  it('should fail because function test failed', function() {
    rxrestassert.expect('GET', 'foo', function(request) {
      return false
    })

    return rxrest.one('foo')
    .get()
    .observe(() => {})
    .then((d) => {
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e.message).to.equal('The request test failed')
    })
  })

  it('should success because function test pass', function() {
    rxrestassert.expect('GET', 'foo', function(request) {
      expect(request.url).to.match(/foo/)
      return true
    })

    return rxrest.one('foo')
    .get()
    .observe(() => {})
    .then((d) => {})
  })

  it('should success because request test pass', function() {
    let headers = new Headers()
    headers.append('Content-Type', 'application/json')

    rxrestassert.expect('GET', 'foo', new Request('foo?test=foobar', {headers: headers}))

    return rxrest.one('foo')
    .get({test: 'foobar'}, headers)
    .observe(() => {})
    .then((d) => {})
  })

  it('should fail because request headers test fail', function() {
    let headers = new Headers()
    headers.append('Content-Type', 'application/json')

    rxrestassert.expect('GET', 'foo', new Request('foo?test=foobar', {headers: headers}))

    return rxrest.one('foo')
    .get({test: 'foobar'}, {})
    .observe(() => {})
    .then((d) => {
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e.message).to.equal('Header "content-type" does not match on Request, found "null" but "application/json" was expected')
    })
  })

  it('should fail because request query params test fail', function() {
    rxrestassert.expect('GET', 'foo', new Request('foo?test=foobar'))

    return rxrest.one('foo')
    .get({}, {})
    .observe(() => {})
    .then((d) => {
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e.message).to.equal('Query param "test" does not match on Request, found "null" but "foobar" was expected')
    })
  })

  it('should not fail because there is nothing to expect', function() {
    rxrestassert.expect('GET', 'foo', new Request('foo'))

    return rxrest.one('foo')
    .get({}, {})
    .observe(() => {})
    .then((d) => {})
  })

  it('should not assert when using when', function() {
    let headers = new Headers()
    headers.append('content-type', 'application/json')

    rxrestassert.when('get', 'foo', new Request('foo?test=foobar', {headers: headers}))

    return rxrest.one('foo')
    .get({}, {})
    .observe(() => {})
    .then((d) => {})
  })

  it('should get when response', function() {
    rxrestassert.when('GET', 'foo').respond({foo: 'bar', id: 1})

    return rxrest.one('foo')
    .get()
    .observe(e => {
      expect(e.plain()).to.deep.equal({foo: 'bar', id: 1})
    })
  })

  it('should have pending requests', function() {
    return rxrest.one('foo')
    .get()
    .observe(() => {})
    .then(() => {
      rxrestassert.verifyNoOutstandingRequest()
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e).to.be.an.instanceOf(RxRestAssertionError)
      expect(e.message).to.equal('There is 1 pending request')
    })
  })

  it('should have pending expectations', function() {
    rxrestassert.expect('GET', 'foo', new Request('foo'))
    rxrestassert.expect('POST', 'bar', new Request('foo'))

    return rxrest.one('foo')
    .get({}, {})
    .observe(() => {})
    .then((d) => {
      rxrestassert.verifyNoOutstandingExpectation()
      throw new ReferenceError('Has not fail')
    })
    .catch(e => {
      expect(e).to.be.an.instanceOf(RxRestAssertionError)
      expect(e.message).to.equal('There is 1 pending expectation')
      rxrestassert.resetExpectations()
      rxrestassert.verifyNoOutstandingExpectation()
    })
  })

  it('should respond with an array', function() {
    rxrestassert.expectGET('test').respond([{a: 'b', id: 1}, {a: 'c', id: 2}])
    const e = []

    return rxrest.all('test')
    .get()
    .observe((d) => {
      e.push(d)
    })
    .then(() => {
      expect(e).to.have.length.of(2)
    })
  })

  it('should catch error with bad status code', function(cb) {
    let i = rxrestInstance.responseInterceptors.push(function(response) {
      if (response.status === 500) {
        throw new Error('fail')
      }
    })

    rxrestassert.expectDELETE('test').respond(500)

    rxrest.all('test')
    .remove()
    .observe(() => {})
    .then(() => {
    })
    .catch((e) => {
      expect(e.message).to.equal('fail')
      rxrestInstance.responseInterceptors.length--
      cb()
    })
  })

  it('should destroy', function() {
    rxrestassert.destroy()
    expect(rxrestInstance.requestInterceptors).to.have.length.of(0)
    expect(rxrestInstance.responseInterceptors).to.have.length.of(0)
    rxrestassert.verifyNoOutstandingRequest()
  })

  it('should call methods with correct method', function() {
    ;['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(e => {
      rxrestassert.when = function(method) {
        expect(e).to.equal(method)
      }

      rxrestassert.expect = function(method) {
        expect(e).to.equal(method)
      }

      rxrestassert[`when${e}`]()
      rxrestassert[`expect${e}`]()
    })
  })
})
