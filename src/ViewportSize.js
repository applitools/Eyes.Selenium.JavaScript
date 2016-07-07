/*
 ---

 name: ViewportSize

 description: helper method to acquire viewport dimensions.

 provides: [ViewportSize]

 ---
 */

(function () {
    "use strict";

    var GET_VIEWPORT_SIZE = "var height = undefined;"
            + "var width = undefined;"
            + "  if (window.innerHeight) {height = window.innerHeight;}"
            + "  else if (document.documentElement "
            + "&& document.documentElement.clientHeight) "
            + "{height = document.documentElement.clientHeight;}"
            + "  else { var b = document.getElementsByTagName('body')[0]; "
            + "if (b.clientHeight) {height = b.clientHeight;}"
            + "};"
            + " if (window.innerWidth) {width = window.innerWidth;}"
            + " else if (document.documentElement "
            + "&& document.documentElement.clientWidth) "
            + "{width = document.documentElement.clientWidth;}"
            +" else { var b = document.getElementsByTagName('body')[0]; "
            + "if (b.clientWidth) {"
            + "width = b.clientWidth;}"
            + "};"
            + "return {width: width, height: height};",
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
                    driver.manage().window().setSize(size.width, size.height)
                        .then(function () {
                            _retryCheckWindowSize(driver, size, retries - 1, promiseFactory).then(function (retriesLeft) {
                                resolve(retriesLeft);
                            }, function (err) {
                                reject(err);
                            });
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
                return driver.executeScript(GET_VIEWPORT_SIZE)
                    .then(function (size) {
                        if (size.width > 0 && size.height > 0) {
                            resolve(size);
                            return;
                        }
                    }, function () {
                    });
            } catch (err) {
                driver.manage().window().getSize().then(function (size) {
                    resolve(size);
                });
            }
        }.bind(this));
    };

    // TODO: handle the maximize window bug
    ViewportSize.setViewportSize = function (driver, size, promiseFactory, lastRetry) {
        // first we will set the window size to the required size. Then we'll check the viewport size and increase the
        // window size accordingly.
        return promiseFactory.makePromise(function (resolve, reject) {
            try {
                driver.manage().window().getSize()
                    .then(function(browserSize){
                        ViewportSize.getViewportSize(driver, promiseFactory)
                            .then(function (viewportSize) {
                                var requiredBrowserSize = {
                                    height: browserSize.height + (size.height - viewportSize.height),
                                    width: browserSize.width + (size.width - viewportSize.width)
                                };
                                driver.manage().window().setSize(requiredBrowserSize.width, requiredBrowserSize.height)
                                    .then(function () {
                                        _retryCheckWindowSize(driver, requiredBrowserSize, 3, promiseFactory).then(function (retriesLeft) {
                                            _retryCheckViewportSize(driver, size, retriesLeft, promiseFactory)
                                                .then(function () {
                                                    resolve();
                                                }, function (err) {
                                                    if(lastRetry){
                                                        reject(err);
                                                    } else {
                                                        ViewportSize.setViewportSize(driver, size, promiseFactory, true);
                                                    }
                                                });
                                        }, function (err) {
                                            reject(err);
                                        });

                                    });
                            });
                    })

            } catch (err) {
                reject(new Error(err));
            }
        }.bind(this));
    };

    module.exports = ViewportSize;
}());
