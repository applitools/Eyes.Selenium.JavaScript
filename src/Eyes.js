/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [eyes.sdk, EyesWebDriver, ViewportSize, selenium-webdriver]

 ---
 */

;(function() {
    "use strict";

    var EyesSDK = require('eyes.sdk');
    var EyesBase = EyesSDK.EyesBase,
        EyesWebDriver = require('./EyesWebDriver'),
        ViewportSize = require('./ViewportSize'),
        PromiseFactory = EyesSDK.EyesPromiseFactory,
        webdriver = require('selenium-webdriver');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUrl
     * @param {Boolean} isDisabled - set to true to disable Applitools Eyes and use the webdriver directly.
     *
     **/
    function Eyes(serverUrl, isDisabled) {
        EyesBase.call(this, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._getBaseAgentId = function () {
        return 'selenium-js/0.0.7';
    };

    Eyes.prototype.open = function (driver, appName, testName, viewportSize) {
        var flow = this._flow = driver.controlFlow();
        PromiseFactory.setPromiseHandler(function (asyncAction) {
            return flow.execute(function () {
                var deferred = webdriver.promise.defer();
                asyncAction(deferred.fulfill, deferred.reject);
                return deferred.promise;
            });
        });
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes open');
            try {
                EyesBase.prototype.open.call(this, appName, testName, viewportSize)
                    .then(function () {
                        console.log('inner eyes open returned - fulfilling');
                        this._driver = driver; //TODO: new EyesWebDriver(driver, this);
                        // this._driver.init().then(function () {
                        deferred.fulfill(this._driver);
                        //}.bind(this));
                    }.bind(this));
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.close = function (throwEx) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes close');
            EyesBase.prototype.close.call(this, throwEx)
                .then(function (results) {
                    console.log('inner eyes close returned - fulfilling');
                    deferred.fulfill(results);
                }.bind(this), function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkWindow = function (tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes check window');
            try {
                EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout).then(function () {
                        console.log('inner eyes check window returned - fulfilling');
                        deferred.fulfill();
                    }.bind(this),
                    function (err) {
                        console.log(err);
                        deferred.reject(err);
                    });
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            console.log('returning check window promise');
            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkRegion = function (region, tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes check region');
            try {
                EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout, region).then(function () {
                        console.log('inner eyes check region returned - fulfilling');
                        deferred.fulfill();
                    }.bind(this),
                    function (err) {
                        console.log(err);
                        deferred.reject(err);
                    });
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            console.log('returning check window promise');
            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkRegionByElement = function (element, tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes check region');
            try {
                element.getSize().then(function(size) {
                    element.getLocation().then(function(point) {
                        var region = {height: size.height, width: size.width, left: point.x, top: point.y};
                        EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout, region).then(function () {
                                console.log('inner eyes check region returned - fulfilling');
                                deferred.fulfill();
                            }.bind(this),
                            function (err) {
                                console.log(err);
                                deferred.reject(err);
                            });
                    }.bind(this));
                }.bind(this));
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            console.log('returning check window promise');
            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkRegionBy = function (by, tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes check region');
            try {
                this._driver.findElement(by).then(function(element) {
                    element.getSize().then(function(size) {
                        element.getLocation().then(function(point) {
                            var region = {height: size.height, width: size.width, left: point.x, top: point.y};
                            EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout, region).then(function () {
                                    console.log('inner eyes check region returned - fulfilling');
                                    deferred.fulfill();
                                }.bind(this),
                                function (err) {
                                    console.log(err);
                                    deferred.reject(err);
                                });
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            console.log('returning check window promise');
            return deferred.promise;
        }.bind(this));
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._waitTimeout = function (ms) {
        return this._flow.timeout(ms);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getScreenshot = function () {
        return this._driver.takeScreenshot().then(function (screenshot64) {
            // Notice that returning a value from inside "then" automatically wraps the return value with a promise,
            // so we don't have to do it explicitly.
            return new Buffer(screenshot64, 'base64');
        });
    };

    Eyes.prototype.getTitle = function () {
        return this._driver.getTitle();
    };

    Eyes.prototype.getViewportSize = function () {
        return ViewportSize.getViewportSize(this._driver);
    };

    Eyes.prototype.setViewportSize = function (size) {
        return ViewportSize.setViewportSize(this._driver, size);
    };

    module.exports = Eyes;
}());
