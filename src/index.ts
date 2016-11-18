import {RxRest} from 'rxrest'
import {of} from 'most'

const rxRest = new RxRest()

export type TestFunction = (request: Request) => boolean

export class RxRestAssert {
    $expectations: any[] = []
    $interceptorIndex: number = 0

    constructor() {
        this.$interceptorIndex = rxRest.requestInterceptors.push((request: Request) => {
            this.$expectations[this.$expectations.length - 1](request)
        })

        rxRest.fetch = (request: Request) => {
            let expectation = this.$expectations.shift()
            let response = expectation.response ? expectation.response : new Response('{}')

            return of(response)
        }
    }

    $expectation(method: string, url: string|RegExp, data?: Request|TestFunction) {
        const assert: any = function(request: Request) {
            if (request.method !== method) {
                throw new TypeError(`Method should be "${method}", got "${request.method}"`)
            }

            let requestURL = request.url.replace(rxRest.baseURL, '').replace(/\?.+/, '').replace(/\/$/, '')

            if (
                (url instanceof RegExp && !url.test(requestURL))
                ||
                url !== requestURL
            ) {
                throw new TypeError(`URL should ${url instanceof RegExp ? `match "${url.toString()}"` : `be "${url}"`}, got "${requestURL}"`)
            }

            if (typeof data === 'function' && !data(request)) {
                throw new TypeError('The request test failed') 
            } else if (data instanceof Request) {

                for (let header of <Headers> data.headers) {
                    let requestHeaderValue = (request.headers as Headers).get(header[0])
                    if (requestHeaderValue !== header[1]) {
                        throw new TypeError(`Header "${header[0]}" does not match on Request, found "${requestHeaderValue}" but "${header[1]}" was expected`)
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
                            throw new TypeError(`Query param "${param[0]}" does not match on Request, found "${requestQueryParam}" but "${param[1]}" was expected`)
                        }
                    }
                }
            }
        }

        assert.respond = (response: Response|Object) => {
            assert.response = response instanceof Response ? response : new Response(JSON.stringify(response))
        }

        return assert
    }

    expect(method: string, url: string|RegExp, data?: Request|TestFunction): Object {
       let expect = this.$expectation(method, url, data)
       let index = this.$expectations.push(expect)
       return {respond: expect.respond}
    }

    resetExpectations() {
       this.$expectations.length = 0
    }

    destroy() {
        this.resetExpectations()
        rxRest.fetch = null
        rxRest.requestInterceptors.splice(this.$interceptorIndex, 1)
    }
}