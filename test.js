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

const {RxRestAssert} = require('./lib/index.js')
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

    it('should fail because method is not GET', function() {
        rxrestassert.expect('GET', 'foo')

        return rxrest.one('foo')
        .post({foo: 'bar'})
        .then((d) => {})
        .catch(e => {
            expect(e.message).to.equal('Method should be "GET", got "POST"')
        })
    })

    it('should fail because url is not /foo/', function() {
        rxrestassert.expect('GET', /foo/)

        return rxrest.one('bar')
        .get()
        .then((d) => {})
        .catch(e => {
            expect(e.message).to.equal('URL should match "/foo/", got "bar"')
        })
    })

    it('should fail because url is not foo', function() {
        rxrestassert.expect('GET', 'foo')

        return rxrest.one('bar')
        .get()
        .then((d) => {})
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
        .then((d) => {})
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
        .then((d) => {})
    })

    it('should success because request test pass', function() {
        let headers = new Headers()
        headers.append('Content-Type', 'application/json')

        rxrestassert.expect('GET', 'foo', new Request('foo?test=foobar', {headers: headers}))

        return rxrest.one('foo')
        .get({test: 'foobar'}, headers)
        .then((d) => {})
    })

    it('should fail because request headers test fail', function() {
        let headers = new Headers()
        headers.append('Content-Type', 'application/json')

        rxrestassert.expect('GET', 'foo', new Request('foo?test=foobar', {headers: headers}))

        return rxrest.one('foo')
        .get({test: 'foobar'}, {})
        .then((d) => {})
        .catch(e => {
            expect(e.message).to.equal('Header "content-type" does not match on Request, found "null" but "application/json" was expected')
        })
    })

    it('should fail because request query params test fail', function() {
        rxrestassert.expect('GET', 'foo', new Request('foo?test=foobar'))

        return rxrest.one('foo')
        .get({}, {})
        .then((d) => {})
        .catch(e => {
            expect(e.message).to.equal('Query param "test" does not match on Request, found "null" but "foobar" was expected')
        })
    })

    it('should not fail because there is nothing to expect', function() {
        rxrestassert.expect('GET', 'foo', new Request('foo'))

        return rxrest.one('foo')
        .get({}, {})
        .then((d) => {})
    })
})
