/*
 ---

 name: EyesPromiseFactory

 description: Wraps a promise in webdriver control flow execution

 provides: [EyesPromiseFactory]

 ---
 */

;(function() {
    "use strict";

    var webdriver = require('selenium-webdriver');

    var EyesPromiseFactory = {};

    /**
     *
     * When ever you need to produce a promise - call this method and return the return value's promise.
     * call ret.fulfill(result) to fulfill the promise
     *
     * @example:
     * var deferred = EyesPromiseFactory.makePromise();
     * async_method(deferred) {deferred.fulfill(result};}
     * return deferred.promise;
     *
     * @method makePromise
     *
     * @return {Object} deferred promise
     *
     **/
    EyesPromiseFactory.makePromise = function (asyncAction) {
        return webdriver.promise.controlFlow().execute(function () {
            var deferred = webdriver.promise.defer();
            asyncAction(deferred);
            return deferred.promise;
        });
    };

    module.exports = EyesPromiseFactory;
}());