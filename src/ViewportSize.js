/*
 ---

 name: ViewportSize

 description: helper method to acquire viewport dimensions.

 provides: [ViewportSize]

 ---
 */

;(function() {
    "use strict";

    var EyesSDK = require('eyes.sdk');
    var PromiseFactory = EyesSDK.EyesPromiseFactory;
    var webdriver = require('selenium-webdriver');
    var Window = webdriver.WebDriver.Window;

    // consts
    var _GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER =
            'return {width: window.innerWidth, height: window.innerHeight}',
        _GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS =
            'return {width: document.documentElement.clientWidth, height: document.documentElement.clientHeight}';

    var ViewportSize = {};

    /**
     *
     * Tries to get the viewport size using Javascript. If fails, gets the entire browser window size!
     *
     * @method getViewportSize
     * @param {Object} driver
     *
     * @return {Object} the size
     *
     **/
    ViewportSize.getViewportSize = function (driver) {
        console.log('ViewportSize.getViewportSize called');
        return PromiseFactory.makePromise(function (deferred) {
            try {
                console.log('ViewportSize.getViewportSize - executing scripts');
                driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER).then(function(size) {
                        if (size.width > 0 && size.height > 0) {
                            console.log('ViewportSize.getViewportSize - normal script returned size: w', size.width,
                                ' h', size.height);
                            deferred.fulfill(size);
                            return;
                        }

                        console.log('ViewportSize.getViewportSize - normal script returned bad size - calling old script');

                        driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS).then(function(size) {
                            console.log('ViewportSize.getViewportSize - old script returned size: w', size.width,
                                ' h', size.height);
                            deferred.fulfill(size);
                        });
                    },
                    function(err){
                        console.log('ViewportSize.getViewportSize - error while getting viewport size - ' +
                            'attempting old browser script', err);
                        driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS).then(function(size) {
                            console.log('ViewportSize.getViewportSize - old script returned size: w', size.width,
                                ' h', size.height);
                            deferred.fulfill(size);
                        });
                    });
            } catch (err) {
                console.log('ViewportSize.getViewportSize - exception - so using window size', err);
                new Window(driver).getSize().then(function(size){
                    console.log('ViewportSize.getViewportSize - window returned size: w', size.width,
                        ' h', size.height);
                    deferred.fulfill(size);
                });
            }
        }.bind(this));
    };

    // TODO: handle the maximize window bug
    ViewportSize.setViewportSize = function (driver, size) {
        console.log('ViewportSize.setViewportSize called for size', size);
        // first we will set the window size to the required size. Then we'll check the viewport size and increase the
        // window size accordingly.
        return PromiseFactory.makePromise(function (deferred) {
            try {
                driver.manage().window().setSize(size.width, size.height)
                    .then(function () {
                        _retryCheckWindowSize(driver, size, 3).then(function (retriesLeft) {
                            ViewportSize.getViewportSize(driver)
                                .then(function(viewportSize) {
                                    var computedSize = {
                                        width: ((2 * size.width) - viewportSize.width),
                                        height: ((2 * size.height) - viewportSize.height)};
                                    console.log('initial viewport size:', viewportSize, 'setting to:', computedSize);
                                    driver.manage().window().setSize(computedSize.width, computedSize.height)
                                        .then(function () {
                                            _retryCheckViewportSize(driver, size, retriesLeft)
                                                .then(function () {
                                                    deferred.fulfill();
                                                }, function (err) {
                                                    console.error('Failed to set browser size!');
                                                    deferred.reject(err);
                                                });
                                        });
                                });
                        }, function (err) {
                            console.error('Failed to set browser size!');
                            deferred.reject(err);
                        });
                    });
            } catch (err) {
                console.log('ViewportSize.setViewportSize - exception:', err);
                deferred.reject(err);
            }
        }.bind(this));
    };

    function _retryCheckWindowSize(driver, size, retries) {
        return PromiseFactory.makePromise(function (deferred) {

            driver.manage().window().getSize().then(function(winSize) {
                if (winSize.width == size.width && winSize.height == size.height) {
                    console.log('window size successfully set');
                    deferred.fulfill(retries);
                    return;
                }

                if (retries == 0) {
                    console.error('no more retries to set window size');
                    deferred.reject('no more retries to set window size');
                    return;
                }

                console.log('window size still not set - timeout and rechecking');
                driver.controlFlow().timeout(1000).then(function() {
                    _retryCheckWindowSize(driver, size, retries - 1).then(function (retriesLeft){
                        deferred.fulfill(retriesLeft);
                    }, function(err) {
                        deferred.reject(err);
                    });
                });
            });
        });
    }

    function _retryCheckViewportSize(driver, size, retries) {
        return PromiseFactory.makePromise(function (deferred) {

            ViewportSize.getViewportSize(driver).then(function(viewportSize) {
                if (viewportSize.width == size.width && viewportSize.height == size.height) {
                    console.log('viewport size successfully set');
                    deferred.fulfill(retries);
                    return;
                }

                if (retries == 0) {
                    console.error('no more retries to set viewport size');
                    deferred.reject('no more retries to set viewport size');
                    return;
                }

                console.log('viewport size still not set - timeout and rechecking');
                driver.controlFlow().timeout(1000).then(function() {
                    _retryCheckViewportSize(driver, size, retries - 1).then(function (retriesLeft){
                        deferred.fulfill(retriesLeft);
                    }, function(err) {
                        deferred.reject(err);
                    });
                });
            });
        });
    }

    module.exports = ViewportSize;
}());