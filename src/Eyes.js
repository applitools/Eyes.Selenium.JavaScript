/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [eyes.sdk, EyesWebDriver, ViewportSize, selenium-webdriver]

 ---
 */

(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk');
    var EyesBase = EyesSDK.EyesBase;
    var ViewportSize = require('./ViewportSize');
    var promise = require('selenium-webdriver').promise;
    var EyesUtils = require('eyes.utils');
    var PromiseFactory = EyesUtils.PromiseFactory;
    var BrowserUtils = EyesUtils.BrowserUtils;
    var EyesWebDriver = require('./EyesWebDriver');

    /**
     *
     * @param {String} serverUrl
     * @param {Boolean} isDisabled - set to true to disable Applitools Eyes and use the webdriver directly.
     * @constructor
     **/
    function Eyes(serverUrl, isDisabled) {
        this._forceFullPage = false;
        this._imageRotationDegrees = 0;
        this._automaticRotation = true;
        this._isLandscape = false;
        this._hideScrollbars = false;
        this._stitchMode = Eyes.StitchMode.Scroll;
        this._promiseFactory = new PromiseFactory();
        EyesBase.call(this, this._promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    Eyes.StitchMode = Object.freeze({
        // Uses scrolling to get to the different parts of the page.
        Scroll: 'Scroll',
        // Uses CSS transitions to get to the different parts of the page.
        CSS: 'CSS'
    });

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._getBaseAgentId = function() {
        return 'selenium-js/0.0.37';
    };

    function _init(that, flow) {
        // Set PromiseFactory to work with the protractor control flow and promises
        that._promiseFactory.setFactoryMethods(function(asyncAction) {
            return flow.execute(function() {
                var deferred = promise.defer();
                asyncAction(deferred.fulfill, deferred.reject);
                return deferred.promise;
            });
        }, function() {
            return promise.defer();
        });
    }

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.open = function(driver, appName, testName, viewportSize) {
        var that = this;
        var flow = that._flow = driver.controlFlow();
        _init(that, flow);

        if (this._isDisabled) {
            return that._flow.execute(function() {
                return driver;
            });
        }
        return this._flow.execute(function() {
            return driver.getCapabilities()
                .then(function(capabilities) {
                    var platformName = capabilities.caps_.platformName;
                    var platformVersion = capabilities.caps_.platformVersion;
                    var orientation = capabilities.caps_.orientation || capabilities.caps_.deviceOrientation;

                    var majorVersion;
                    if (!platformVersion || platformVersion.length < 1) {
                        return;
                    }
                    majorVersion = platformVersion.split('.', 2)[0];
                    if (platformName.toUpperCase() === 'ANDROID') {
                        that.setHostOS('Android ' + majorVersion);
                    } else if (platformName.toUpperCase() === 'IOS') {
                        that.setHostOS('iOS ' + majorVersion);
                    } else {
                        return;
                    }

                    if (orientation && orientation.toUpperCase() === 'LANDSCAPE') {
                        that._isLandscape = true;
                    }
                })
                .then(function() {
                    return EyesBase.prototype.open.call(that, appName, testName, viewportSize)
                        .then(function() {
                            that._driver = new EyesWebDriver(driver, that, that._logger);
                            return that._driver;
                        });
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.close = function(throwEx) {
        var that = this;

        if (this._isDisabled) {
            return that._flow.execute(function() {
            });
        }
        if (throwEx === undefined) {
            throwEx = true;
        }

        return that._flow.execute(function() {
            return EyesBase.prototype.close.call(that, false)
                .then(function(results) {
                    if (results.isPassed || !throwEx) {
                        return results;
                    } else {
                        throw EyesBase.buildTestError(results, that._sessionStartInfo.scenarioIdOrName,
                            that._sessionStartInfo.appIdOrName);
                    }
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.checkWindow = function(tag, matchTimeout) {
        var that = this;
        if (that._isDisabled) {
            return that._flow.execute(function() {
            });
        }
        return that._flow.execute(function() {
            return EyesBase.prototype.checkWindow.call(that, tag, false, matchTimeout)
                .then(function(result) {
                    if (result.asExpected || !that._failureReportOverridden) {
                        return result;
                    } else {
                        throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName,
                            that._sessionStartInfo.appIdOrName);
                    }
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     *
     * @param {Object} region The region to validate (in screenshot coordinates).
     *                          Object is {width: *, height: *, top: *, left: *}
     * @param {string} tag An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout The amount of time to retry matching.
     * @return {Promise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegion = function(region, tag, matchTimeout) {
        var that = this;
        if (this._isDisabled) {
            return that._flow.execute(function() {
            });
        }
        return that._flow.execute(function() {
            return EyesBase.prototype.checkWindow.call(that, tag, false, matchTimeout, region)
                .then(function(result) {
                    if (result.asExpected || !that._failureReportOverridden) {
                        return result;
                    } else {
                        throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName,
                            that._sessionStartInfo.appIdOrName);
                    }
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     *
     * @param {WebElement} element The element defining the region to validate.
     * @param {string} tag An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout The amount of time to retry matching.
     * @return {Promise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionByElement = function(element, tag, matchTimeout) {
        var that = this;
        var size;
        if (this._isDisabled) {
            return that._flow.execute(function() {
            });
        }
        return that._flow.execute(function() {
            return element.getSize()
                .then(function(elementSize) {
                    size = elementSize;
                    return element.getLocation();
                })
                .then(function(point) {
                    var region = {height: size.height, width: size.width, left: point.x, top: point.y, relative: true};
                    return EyesBase.prototype.checkWindow.call(that, tag, false, matchTimeout, region)
                        .then(function(result) {
                            if (result.asExpected || !that._failureReportOverridden) {
                                return result;
                            } else {
                                throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName,
                                    that._sessionStartInfo.appIdOrName);
                            }
                        });
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     *
     * @param {By} by The WebDriver selector used for finding the region to validate.
     * @param {string} tag An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout The amount of time to retry matching.
     * @return {Promise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionBy = function(by, tag, matchTimeout) {
        var that = this;
        var element;
        var size;
        if (this._isDisabled) {
            return that._flow.execute(function() {
            });
        }
        return that._flow.execute(function() {
            return that._driver.findElement(by)
                .then(function(elem) {
                    element = elem;
                    return element.getSize();
                })
                .then(function(elementSize) {
                    size = elementSize;
                    return element.getLocation();
                })
                .then(function(point) {
                    var region = {height: size.height, width: size.width, left: point.x, top: point.y, relative: true};
                    return EyesBase.prototype.checkWindow.call(that, tag, false, matchTimeout, region)
                        .then(function(result) {
                            if (result.asExpected || !that._failureReportOverridden) {
                                return result;
                            } else {
                                throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName,
                                    that._sessionStartInfo.appIdOrName);
                            }
                        });
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._waitTimeout = function(ms) {
        return this._flow.timeout(ms);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getScreenShot = function() {
        return BrowserUtils.getScreenshot(this._driver, this._promiseFactory, this._viewportSize, this._forceFullPage,
            this._hideScrollbars, this._stitchMode === Eyes.StitchMode.CSS, this._imageRotationDegrees,
            this._automaticRotation, this._os === 'Android' ? 90 : 270, this._isLandscape);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getTitle = function() {
        return this._driver.getTitle();
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getInferredEnvironment = function() {
        var res = 'useragent:';
        return this._driver.executeScript('return navigator.userAgent')
            .then(function(userAgent) {
                return res + userAgent;
            }, function() {
                return res;
            });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param mode Use one of the values in EyesBase.FailureReport.
     */
    Eyes.prototype.setFailureReport = function(mode) {
        if (mode === EyesBase.FailureReport.Immediate) {
            this._failureReportOverridden = true;
            mode = EyesBase.FailureReport.OnClose;
        }

        EyesBase.prototype.setFailureReport.call(this, mode);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getViewportSize = function() {
        return ViewportSize.getViewportSize(this._driver, this._promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setViewportSize = function(size) {
        return ViewportSize.setViewportSize(this._driver, size, this._promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setForceFullPageScreenshot = function(force) {
        this._forceFullPage = force;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getForceFullPageScreenshot = function() {
        return this._forceFullPage;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setForcedImageRotation = function(degrees) {
        if (typeof degrees != 'number') {
            throw new TypeError('degrees must be a number! set to 0 to clear');
        }
        this._imageRotationDegrees = degrees;
        this._automaticRotation = false;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getForcedImageRotation = function() {
        return this._imageRotationDegrees || 0;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setHideScrollbars = function(hide) {
        this._hideScrollbars = hide;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getHideScrollbars = function() {
        return this._hideScrollbars;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param mode Use one of the values in Eyes.StitchMode.
     */
    Eyes.prototype.setStitchMode = function(mode) {
        switch (mode) {
            case Eyes.StitchMode.Scroll:
                this._stitchMode = Eyes.StitchMode.Scroll;
                break;
            case Eyes.StitchMode.CSS:
                this._stitchMode = Eyes.StitchMode.CSS;
                break;
            default:
                this._stitchMode = Eyes.StitchMode.Scroll;
                break;
        }
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @return {Eyes.StitchMode} The currently set StitchMode.
     */
    Eyes.prototype.getStitchMode = function() {
        return this._stitchMode;
    };

    module.exports = Eyes;
}());
