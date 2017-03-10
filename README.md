RxRest Assert [![Build Status](https://travis-ci.org/soyuka/rxrest-assert.svg?branch=master)](https://travis-ci.org/soyuka/rxrest-assert)
=============

Assertion library for [`RxRest`](https://github.com/soyuka/rxrest).

```
npm install rxrest-assert --save-dev
```

## Example

```javascript
const {RxRestAssert} = require('rxrest-assert')
const assert = new RxRestAssert()

assert.expectGET('foo')
.respond({foo: 'bar', id: 1})

rxrest.one('foo')
.post()
.then(e => {

})
.catch(e => {
  console.log(e.message) //Method should be "GET", got "POST"
})
```

## API

The API is inspired by the angular [$httpBackend](https://docs.angularjs.org/api/ngMock/service/$httpBackend) service.


### Expect

Expectations must respect requests order.

```javascript
expect(method, url, [request])
```

#### Parameters

| Param | Type | Details |
| ----- | ---- | ------- |
| method | string | HTTP method |
| url | string or RegExp | HTTP url or RegExp to match requested url |
| request | Request | The expected Request. It's url query params or headers will be tested against the request |

For example, to match headers and query parameters:

```javascript
let headers = new Headers()
headers.set('Authorization', 'Bearer foo')

assert.expect('GET', 'foo', new Request('foo?test=foobar', {headers: headers})

rxrest
.one('foo')
.get({test: 'foobar'}, {'Authorization': 'Bearer foo'})
.then(e => {})
.catch(e => {})
```

#### Returns

Returns an object with a `respond` method:

```javascript
respond(response: Response|Object|number)
```

- If the response is an Object it'll be the response body (json encoded).
- If it's a number, it will be the reponse status
- If it's a Response instance, it's taken as is

#### Aliases

```javascript
expectGET(url, request)
expectPOST(url, request)
expectPUT(url, request)
expectHEAD(url, request)
expectPATCH(url, request)
expectDELETE(url, request)
```

### When

`When` doesn't depend on the requests order and it's signature is `{method, url}`.

The API is the same as expect:

```javascript
when(method, url, [request])
```

#### Aliases

```
whenGET(url, request)
whenPOST(url, request)
whenPUT(url, request)
whenHEAD(url, request)
whenPATCH(url, request)
whenDELETE(url, request)
```
