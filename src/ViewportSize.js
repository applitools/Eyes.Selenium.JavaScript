/*
 ---

 name: ViewportSize

 description: helper method to acquire viewport dimensions.

 provides: [ViewportSize]

 ---
 */

(function () {
    "use strict";

    var webdriver = require('selenium-webdriver'),
        Window = webdriver.WebDriver.Window,
        // consts
        _GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER =
            'return {width: window.innerWidth, height: window.innerHeight}',
        _GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS =
            'return {width: document.documentElement.clientWidth, height: document.documentElement.clientHeight}',
        ViewportSize = {};

    function _retryCheckViewportSize(driver, size, retries, promiseFactory) {
        return promiseFactory.makePromise(function (resolve, reject) {

            ViewportSize.getViewportSize(driver, promiseFactory).then(function (viewportSize) {
                if (viewportSize.width === size.width && viewportSize.height === size.height) {
                    resolve(retries);
                    return;
                }

                if (retries === 0) {
                    reject(new Error('no more retries to set viewport size'));
                    return;
                }

                driver.controlFlow().timeout(1000).then(function () {
                    _retryCheckViewportSize(driver, size, retries - 1, promiseFactory).then(function (retriesLeft) {
                        resolve(retriesLeft);
                    }, function (err) {
                        reject(err);
                    });
                });
            });
        });
    }

    function _retryCheckWindowSize(driver, size, retries, promiseFactory) {
        return promiseFactory.makePromise(function (resolve, reject) {

            driver.manage().window().getSize().then(function (winSize) {
                if (winSize.width === size.width && winSize.height === size.height) {
                    resolve(retries);
                    return;
                }

                if (retries === 0) {
                    reject(new Error('no more retries to set window size'));
                    return;
                }

                driver.controlFlow().timeout(1000).then(function () {
                    _retryCheckWindowSize(driver, size, retries - 1, promiseFactory).then(function (retriesLeft) {
                        resolve(retriesLeft);
                    }, function (err) {
                        reject(err);
                    });
                });
            });
        });
    }

    /**
     *
     * Tries to get the viewport size using Javascript. If fails, gets the entire browser window size!
     *
     * @method getViewportSize
     * @param {Object} driver
     * @param {Object} promiseFactory
     *
     * @return {Object} the size
     *
     **/
    ViewportSize.getViewportSize = function (driver, promiseFactory) {
        return promiseFactory.makePromise(function (resolve) {
            try {
                return driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER)
                    .then(function (size) {
                        if (size.width > 0 && size.height > 0) {
                            resolve(size);
                            return;
                        }

                        return driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS)
                            .then(function (size) {
                                resolve(size);
                            });
                    }, function () {
                        return driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS)
                            .then(function (size) {
                                resolve(size);
                            });
                    });
            } catch (err) {
                new Window(driver).getSize().then(function (size) {
                    resolve(size);
                });
            }
        }.bind(this));
    };

    // TODO: handle the maximize window bug
    ViewportSize.setViewportSize = function (driver, size, promiseFactory) {
        // first we will set the window size to the required size. Then we'll check the viewport size and increase the
        // window size accordingly.
        return promiseFactory.makePromise(function (resolve, reject) {
            try {
                driver.manage().window().setSize(size.width, size.height)
                    .then(function () {
                        _retryCheckWindowSize(driver, size, 3, promiseFactory).then(function (retriesLeft) {
                            ViewportSize.getViewportSize(driver, promiseFactory)
                                .then(function (viewportSize) {
                                    var computedSize = {
                                        width: ((2 * size.width) - viewportSize.width),
                                        height: ((2 * size.height) - viewportSize.height)
                                    };
                                    driver.manage().window().setSize(computedSize.width, computedSize.height)
                                        .then(function () {
                                            _retryCheckViewportSize(driver, size, retriesLeft, promiseFactory)
                                                .then(function () {
                                                    resolve();
                                                }, function (err) {
                                                    reject(err);
                                                });
                                        });
                                });
                        }, function (err) {
                            reject(err);
                        });
                    });
            } catch (err) {
                reject(new Error(err));
            }
        }.bind(this));
    };

    module.exports = ViewportSize;
}());