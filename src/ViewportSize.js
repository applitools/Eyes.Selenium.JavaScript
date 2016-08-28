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
            + "return {width: width, height: height};";

    var ViewportSize = {};


    function _setWindowSize(driver, size, retries, promiseFactory, logger) {
        return promiseFactory.makePromise(function (resolve, reject) {
            driver.manage().window().setSize(size.width, size.height);
            driver.controlFlow().timeout(1000);
            driver.manage().window().getSize().then(function (browserSize) {
                logger.log("Current browser size: " + browserSize.width + "x" + browserSize.height);
                if (browserSize.width === size.width && browserSize.height === size.height) {
                    resolve();
                    return;
                }

                if (retries === 0) {
                    reject();
                    return;
                }

                _setWindowSize(driver, size, retries - 1, promiseFactory, logger)
                    .then(function () {
                        resolve();
                    }, function () {
                        reject();
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
                        resolve(size);
                    }, function () {
                        driver.manage().window().getSize().then(function (size) {
                            resolve(size);
                        });
                    });
            } catch (err) {
                driver.manage().window().getSize().then(function (size) {
                    resolve(size);
                });
            }
        }.bind(this));
    };

    ViewportSize.setViewportSize = function (driver, size, promiseFactory, logger, lastRetry) {
        // first we will set the window size to the required size. Then we'll check the viewport size and increase the
        // window size accordingly.
        return promiseFactory.makePromise(function (resolve, reject) {
            try {
                ViewportSize.getViewportSize(driver, promiseFactory).then(function (actualViewportSize) {

                    if (actualViewportSize.width === size.width && actualViewportSize.height === size.height) {
                        resolve();
                        return;
                    }

                    driver.manage().window().getSize().then(function (browserSize) {
                        // Edge case.
                        if (browserSize.height < actualViewportSize.height ||
                                browserSize.width < actualViewportSize.width) {
                            logger.log("Browser window size is smaller than the viewport! " +
                                "Using current viewport size as is.");
                            resolve();
                            return;
                        }

                        var requiredBrowserSize = {
                            height: browserSize.height + (size.height - actualViewportSize.height),
                            width: browserSize.width + (size.width - actualViewportSize.width)
                        };

                        logger.log("Trying to set browser size to: " +
                            requiredBrowserSize.width + "x" + requiredBrowserSize.height);
                        _setWindowSize(driver, requiredBrowserSize, 3, promiseFactory, logger)
                            .then(function () {
                                ViewportSize.getViewportSize(driver, promiseFactory)
                                    .then(function (updatedViewportSize) {
                                        if (updatedViewportSize.width === size.width &&
                                                updatedViewportSize.height === size.height) {
                                            resolve();
                                            return;
                                        }
                                        if (lastRetry) {
                                            reject(new Error("Failed to set viewport size!"
                                                + " (Got " + updatedViewportSize.width + "x"
                                                + updatedViewportSize.height
                                                + ") Please try using a smaller viewport size."));
                                        } else {
                                            ViewportSize.setViewportSize(driver, size, promiseFactory, logger, true)
                                                .then(function () {
                                                    resolve();
                                                }, function (err) {
                                                    reject(err);
                                                });
                                        }
                                    });
                            }, function () {
                                reject(new Error("Failed to set browser size! " +
                                    "Please try using a smaller viewport size."));
                            });
                    });
                });
            } catch (err) {
                reject(new Error(err));
            }
        }.bind(this));
    };

    module.exports = ViewportSize;
}());
