/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [eyes.sdk, EyesWebDriver, ViewportSize, selenium-webdriver]

 ---
 */

(function () {
    "use strict";

    var EyesSDK = require('eyes.sdk'),
        EyesBase = EyesSDK.EyesBase,
        MutableImage = EyesSDK.MutableImage,
        EyesWebDriver = require('./EyesWebDriver'),
        ViewportSize = require('./ViewportSize'),
        webdriver = require('selenium-webdriver');

    var EyesUtils = require('eyes.utils'),
        PromiseFactory = EyesUtils.PromiseFactory,
        BrowserUtils = EyesUtils.BrowserUtils;

    EyesUtils.setPromiseFactory(PromiseFactory);
    ViewportSize.setPromiseFactory(PromiseFactory);

    /**
     *
     * @param {String} serverUrl
     * @param {Boolean} isDisabled - set to true to disable Applitools Eyes and use the webdriver directly.
     * @constructor
     **/
    function Eyes(serverUrl, isDisabled) {
        EyesBase.call(this, PromiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._getBaseAgentId = function () {
        return 'selenium-js/0.0.28';
    };

    Eyes.prototype.open = function (driver, appName, testName, viewportSize) {
        var flow = this._flow = driver.controlFlow();
        PromiseFactory.setFactoryMethods(function (asyncAction) {
            return flow.execute(function () {
                var deferred = webdriver.promise.defer();
                asyncAction(deferred.fulfill, deferred.reject);
                return deferred.promise;
            });
        }, function () {
            return webdriver.promise.defer();
        });
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            try {
                EyesBase.prototype.open.call(this, appName, testName, viewportSize)
                    .then(function () {
                        this._driver = new EyesWebDriver(driver, this, this._logger);
                        deferred.fulfill(this._driver);
                    }.bind(this));
            } catch (err) {
                this._logger.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.close = function (throwEx) {
        if (throwEx === undefined) {
            throwEx = true;
        }

        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            try {
                EyesBase.prototype.close.call(this, throwEx)
                    .then(function (results) {
                        deferred.fulfill(results);
                    }.bind(this), function (err) {
                        deferred.reject(err);
                    });
            } catch (err) {
                deferred.reject(err);
                if (throwEx) {
                    throw new Error(err.message);
                }
            }

            return deferred.promise;

        }.bind(this));
    };

    Eyes.prototype.checkWindow = function (tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            try {
                EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout)
                    .then(function () {
                        deferred.fulfill();
                    }.bind(this), function (err) {
                        this._logger.log(err);
                        deferred.reject(err);
                    }.bind(this));
            } catch (err) {
                this._logger.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.checkRegion = function (region, tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            try {
                EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout, region)
                    .then(function () {
                        deferred.fulfill();
                    }.bind(this), function (err) {
                        this._logger.log(err);
                        deferred.reject(err);
                    }.bind(this));
            } catch (err) {
                this._logger.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkRegionByElement = function (element, tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            try {
                element.getSize().then(function (size) {
                    element.getLocation().then(function (point) {
                        var region = {height: size.height, width: size.width, left: point.x, top: point.y};
                        EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout, region)
                            .then(function () {
                                deferred.fulfill();
                            }.bind(this), function (err) {
                                this._logger.log(err);
                                deferred.reject(err);
                            }.bind(this));
                    }.bind(this));
                }.bind(this));
            } catch (err) {
                this._logger.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkRegionBy = function (by, tag, matchTimeout) {
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            try {
                this._driver.findElement(by).then(function (element) {
                    element.getSize().then(function (size) {
                        element.getLocation().then(function (point) {
                            var region = {height: size.height, width: size.width, left: point.x, top: point.y};
                            EyesBase.prototype.checkWindow.call(this, tag, false, matchTimeout, region)
                                .then(function () {
                                    deferred.fulfill();
                                }.bind(this), function (err) {
                                    this._logger.log(err);
                                    deferred.reject(err);
                                }.bind(this));
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            } catch (err) {
                this._logger.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._waitTimeout = function (ms) {
        return this._flow.timeout(ms);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getScreenShot = function () {
        var that = this;
        var parsedImage;
        return that._driver.takeScreenshot()
            .then(function(screenshot64) {
                parsedImage = new MutableImage(new Buffer(screenshot64, 'base64'), that._promiseFactory);
                return parsedImage.getSize();
            })
            .then(function(imageSize) {
                return BrowserUtils.findImageNormalizationFactor(that._driver, imageSize, that._viewportSize);
            })
            .then(function(factor) {
                if (factor === 1) {
                    return parsedImage;
                }

                return parsedImage.scaleImage(factor)
                    .then(function () {
                        return parsedImage;
                    });
            });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getTitle = function () {
        return this._driver.getTitle();
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getInferredEnvironment = function () {
        var res = "useragent:";
        return this._driver.getUserAgent().then(function (userAgent) {
            return res + userAgent;
        }, function () {
            return res;
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getViewportSize = function () {
        return ViewportSize.getViewportSize(this._driver);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setViewportSize = function (size) {
        return ViewportSize.setViewportSize(this._driver, size);
    };

    module.exports = Eyes;
}());
