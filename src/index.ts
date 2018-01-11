/// <reference path="../node-status-code.d.ts" />

import { RequestInterceptor, ResponseInterceptor, RxRestConfiguration } from 'rxrest'
import { Observable } from 'rxjs/Rx'
import 'rxjs/add/observable/of'
import * as nodeStatusCodes from 'node-status-codes'

export declare type RequestIdentifier = {url: string|RegExp, method: string}

export type TestFunction = (request: Request) => boolean
export type RxRestAssertOptions = {
  log: boolean;
}
export type Respond = (response: Response|Object|number) => Assertion
export type Assertion = {method: string; url: string; respond: Respond}

export class RxRestAssertionError extends TypeError {}

export class RxRestAssert {
  $expectations: any[] = []
  $whens: Map<RequestIdentifier, any> = new Map()
  $requestInterceptorIndex: number = 0
  $responseInterceptorIndex: number = 0
  $current: any;
  $requestCount: number = 0;
  log: boolean;
  config: RxRestConfiguration

  constructor(config: RxRestConfiguration, options: RxRestAssertOptions = {log: false}) {
    this.log = options.log
    this.config = config

    this.$requestInterceptorIndex = config.requestInterceptors.push((request: Request) => {
      this.$requestCount++

      let expect = this.$expectations[this.$expectations.length - 1]
      let requestURL = this.$getRequestURL(request)

      if (expect) {
        this.$current = 'expectation'
        return
      }

      for (let key of this.$whens.keys()) {
        if (key.method === request.method && this.$matchURL(key.url, requestURL)) {
          this.$current = key
          return
        }
      }

      this.$current = null
    })

    config.fetch = (request: Request) => {
      const defaultResponse = new Response('{}', {
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      })

      this.$log(`Doing a request ${request.method} ${request.url}`)

      if (this.$current === null) {
        return Observable.of(defaultResponse)
      }

      let expectation: any

      if (this.$current === 'expectation') {
        expectation = this.$expectations.shift()
      } else if (this.$current !== null) {
        expectation = this.$whens.get(this.$current)
      }

      if (expectation !== undefined) {
        expectation(request)
        this.$requestCount--
      } else {
        this.$throw(`Request ${request.method} ${request.url} not expected`)
      }

      let response = expectation.response ? expectation.response : defaultResponse

      return Observable.of(response)
    }

    this.$responseInterceptorIndex = config.responseInterceptors.push((response: Response) => {
      if (this.$current !== null && this.$current !== 'expectation') {
        this.$whens.delete(this.$current)
      }
    })
  }

  $expectation(method: string, url: string|RegExp, data?: Request|TestFunction, assertion: boolean = true) {
    const self = this

    this.$log(`Preparing expectation on ${method} ${url}`)
    const assert: any = function(request: Request) {
      if (assertion === false) {
        return
      }

      if (request.method !== method) {
        self.$throw(`Method should be "${method}", got "${request.method}"`)
      }

      let requestURL = self.$getRequestURL(request)

      if (!self.$matchURL(url, requestURL)) {
        self.$throw(`URL should ${url instanceof RegExp ? `match "${url.toString()}"` : `be "${url}"`}, got "${requestURL}"`)
      }

      if (typeof data === 'function' && !data(request)) {
        self.$throw('The request test failed')
      } else if (data instanceof Request) {

        for (let header of data.headers) {
          let requestHeaderValue = (request.headers as Headers).get(header[0])
          if (requestHeaderValue !== header[1]) {
            self.$throw(`Header "${header[0]}" does not match on Request, found "${requestHeaderValue}" but "${header[1]}" was expected`)
          }
        }

        let expectedQueryParamsString = data.url.match(/\?(.+)/)
        let expectedQueryParams = expectedQueryParamsString === null ? new URLSearchParams() : new URLSearchParams(expectedQueryParamsString[1])

        let requestQueryParamsString = request.url.match(/\?(.+)/)
        let requestQueryParams = requestQueryParamsString === null ? new URLSearchParams() : new URLSearchParams(requestQueryParamsString[1])

        if (expectedQueryParams.toString().length) {
          for (let param of expectedQueryParams) {
            let requestQueryParam = requestQueryParams.get(param[0])
            if (requestQueryParam !== param[1]) {
              self.$throw(`Query param "${param[0]}" does not match on Request, found "${requestQueryParam}" but "${param[1]}" was expected`)
            }
          }
        }
      }
    }

    assert.url = url
    assert.method = method
    assert.respond = (response: Response|Object|number) => {
      let statusCode = (response as number)
      if (!isNaN(statusCode) && isFinite(statusCode)) {
        assert.response = new Response('{}', {status: statusCode, statusText: nodeStatusCodes[statusCode], headers: new Headers()})
        return
      }

      assert.response = response instanceof Response ? response : new Response(JSON.stringify(response), {status: 200, statusText: 'OK', headers: new Headers()})
    }

    return assert
  }

  $log(message: string) {
    if (this.log === false) {
      return
    }

    console.error(message)
  }

  $throw(message: string) {
    this.$requestCount--
    throw new RxRestAssertionError(message)
  }

  $getRequestURL(request: Request): string {
    return request.url.replace(this.config.baseURL, '').replace(/\?.+/, '').replace(/\/$/, '')
  }

  $matchURL(url: string|RegExp, requestURL: string) {
    return (url instanceof RegExp && url.test(requestURL)) || url === requestURL
  }

  expect(method: string, url: string|RegExp, data?: Request|TestFunction): {respond: Respond} {
    method = method.toUpperCase()
    let expect = this.$expectation(method, url, data)
    let index = this.$expectations.push(expect)
    return {respond: expect.respond}
  }

  expectGET(url: string|RegExp, data?: Request) {
    return this.expect('GET', url, data)
  }

  expectPOST(url: string|RegExp, data?: Request) {
    return this.expect('POST', url, data)
  }

  expectPUT(url: string|RegExp, data?: Request) {
    return this.expect('PUT', url, data)
  }

  expectHEAD(url: string|RegExp, data?: Request) {
    return this.expect('HEAD', url, data)
  }

  expectPATCH(url: string|RegExp, data?: Request) {
    return this.expect('PATCH', url, data)
  }

  expectDELETE(url: string|RegExp, data?: Request) {
    return this.expect('DELETE', url, data)
  }

  when(method: string, url: string|RegExp, data?: Request): {respond: Respond} {
    method = method.toUpperCase()
    let expect = this.$expectation(method, url, data, false)
    this.$whens.set({url: url, method: method}, expect)
    return {respond: expect.respond}
  }

  whenGET(url: string|RegExp, data?: Request) {
    return this.when('GET', url, data)
  }

  whenPOST(url: string|RegExp, data?: Request) {
    return this.when('POST', url, data)
  }

  whenPUT(url: string|RegExp, data?: Request) {
    return this.when('PUT', url, data)
  }

  whenHEAD(url: string|RegExp, data?: Request) {
    return this.when('HEAD', url, data)
  }

  whenPATCH(url: string|RegExp, data?: Request) {
    return this.when('PATCH', url, data)
  }

  whenDELETE(url: string|RegExp, data?: Request) {
    return this.when('DELETE', url, data)
  }

  resetExpectations() {
     this.$expectations.length = 0
  }

  verifyNoOutstandingExpectation() {
    if (this.$expectations.length) {
      throw new RxRestAssertionError(`There is ${this.$expectations.length} pending expectation`)
    }
  }

  verifyNoOutstandingRequest() {
    if (this.$requestCount > 0) {
      throw new RxRestAssertionError(`There is ${this.$requestCount} pending request`)
    }
  }

  destroy() {
    this.resetExpectations()
    this.$whens = new Map()
    this.$requestCount = 0
    this.config.fetch = null
    this.config.requestInterceptors = this.config.requestInterceptors
      .filter((e: RequestInterceptor, i: number) => {
        return i === this.$requestInterceptorIndex
      })

    this.config.responseInterceptors = this.config.responseInterceptors
      .filter((e: ResponseInterceptor, i: number) => {
        return i === this.$responseInterceptorIndex
      })

  }
}
