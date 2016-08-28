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

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        promise = require('q'),
        ViewportSize = require('./ViewportSize'),
        EyesWebDriver = require('./EyesWebDriver'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        EyesWebDriverScreenshot = require('./EyesWebDriverScreenshot'),
        EyesSeleniumUtils = require('./EyesSeleniumUtils'),
        ContextBasedScaleProvider = require('./ContextBasedScaleProvider');
    var EyesBase = EyesSDK.EyesBase,
        PromiseFactory = EyesUtils.PromiseFactory,
        BrowserUtils = EyesUtils.BrowserUtils,
        ArgumentGuard = EyesUtils.ArgumentGuard;
    var USE_DEFAULT_MATCH_TIMEOUT = -1,
        RESPONSE_TIME_DEFAULT_DEADLINE = 10,
        RESPONSE_TIME_DEFAULT_DIFF_FROM_DEADLINE = 20,
        DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100; // ms

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
        this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;

        EyesBase.call(this, this._promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
    }

    Eyes.UNKNOWN_DEVICE_PIXEL_RATIO = 0;
    Eyes.DEFAULT_DEVICE_PIXEL_RATIO = 1;

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
        return 'selenium-js/0.0.53';
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
                    var platformName, platformVersion, orientation;
                    if (capabilities.caps_) {
                        platformName = capabilities.caps_.platformName;
                        platformVersion = capabilities.caps_.platformVersion;
                        orientation = capabilities.caps_.orientation || capabilities.caps_.deviceOrientation;
                    } else {
                        platformName = capabilities.get('platform');
                        platformVersion = capabilities.get('version');
                        orientation = capabilities.get('orientation') || capabilities.get('deviceOrientation');
                    }

                    var majorVersion;
                    if (!platformVersion || platformVersion.length < 1) {
                        return;
                    }
                    majorVersion = platformVersion.split('.', 2)[0];
                    if (platformName.toUpperCase() === 'ANDROID') {
                        // We only automatically set the OS, if the user hadn't manually set it previously.
                        if (!that.getHostOS()) {
                            that.setHostOS('Android ' + majorVersion);
                        }
                    } else if (platformName.toUpperCase() === 'IOS') {
                        if (!that.getHostOS()) {
                            that.setHostOS('iOS ' + majorVersion);
                        }
                    } else {
                        return;
                    }

                    if (orientation && orientation.toUpperCase() === 'LANDSCAPE') {
                        that._isLandscape = true;
                    }
                })
                .then(function() {
                    return EyesBase.prototype.open.call(that, appName, testName, viewportSize);
                }).then(function() {
                    return new EyesWebDriver(driver, that, that._logger, that._promiseFactory);
                }).then(function(driver) {
                    that._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;

                    that._driver = driver;
                    return that._driver;
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
            return EyesBase.prototype.close.call(that, throwEx)
                .then(function(results) {
                    return results;
                }, function (err) {
                    throw err;
                });
        });
    };

    /**
     * A helper function for creating region objects to be used in checkWindow
     * @param {Object} point A point which represents the location of the region (x,y).
     * @param {Object} size The size of the region (width, height).
     * @param {boolean} isRelative Whether or not the region coordinates are relative to the image coordinates.
     * @return {Object} A region object.
     */
    var createRegion = function (point, size, isRelative) {
        return {left: Math.ceil(point.x), top: Math.ceil(point.y), width: Math.ceil(size.width),
            height: Math.ceil(size.height), relative: isRelative};
    };

    /**
     * A helper function for calling the checkWindow on {@code EyesBase} and handling the result.
     * @param {Eyes} eyes The Eyes object (a derivative of EyesBase) on which to perform the call.
     * @param {String} tag The tag for the current visual checkpoint.
     * @param {boolean} ignoreMismatch Whether or not the server should ignore a mismatch.
     * @param {int} retryTimeout The timeout. (Milliseconds).
     * @param {Object} region The region to check. Should be of the form  {width, height, left, top}.
     * @returns {Promise} A promise which resolves to the checkWindow result, or an exception of the result failed
     *                      and failure reports are immediate.
     */
    var callCheckWindowBase = function (eyes, tag, ignoreMismatch, retryTimeout, region) {
        return EyesBase.prototype.checkWindow.call(eyes, tag, false, retryTimeout, region)
            .then(function(result) {
                if (result.asExpected || !eyes._failureReportOverridden) {
                    return result;
                } else {
                    throw EyesBase.buildTestError(result, eyes._sessionStartInfo.scenarioIdOrName,
                        eyes._sessionStartInfo.appIdOrName);
                }
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
            return callCheckWindowBase(that, tag, false, matchTimeout, undefined);
        });
    };

    /**
     * Updates the state of scaling related parameters.
     */
    var updateScalingParams = function(eyes) {
        if (eyes._devicePixelRatio == Eyes.UNKNOWN_DEVICE_PIXEL_RATIO) {
            eyes._logger.verbose("Trying to extract device pixel ratio...");

            try {
                var viewportSize;
                return EyesSeleniumUtils.getDevicePixelRatio(eyes._driver).then(function (ratio) {
                    return ratio;
                }, function () {
                    eyes._logger.verbose("Failed to extract device pixel ratio! Using default.");
                    return Eyes.DEFAULT_DEVICE_PIXEL_RATIO;
                }).then(function (ratio) {
                    eyes._devicePixelRatio = ratio;

                    eyes._logger.verbose("Device pixel ratio: " + eyes._devicePixelRatio);
                    eyes._logger.verbose("Setting scale provider..");
                    return eyes.getViewportSize();
                }).then(function (size) {
                    viewportSize = size;
                    return EyesSeleniumUtils.getCurrentFrameContentEntireSize(eyes._driver);
                }).then(function (entireSize) {
                    eyes._scaleProvider = new ContextBasedScaleProvider(entireSize, viewportSize, eyes._devicePixelRatio, eyes._promiseFactory);

                    return eyes._scaleProvider;
                });
            } catch (err) {
                // This can happen in Appium for example.
                eyes._logger.verbose("Failed to set ContextBasedScaleProvider.");
                eyes._logger.verbose("Using FixedScaleProvider instead...");
                throw Error();
                //eyes._scaleProvider = new FixedScaleProvider(1 / eyes._devicePixelRatio);
            }
        }
    };

    /**
     * Verifies the current frame.
     *
     * @param eyes
     * @param {int} matchTimeout The amount of time to retry matching.
     *                     (Milliseconds)
     * @param {string} tag An optional tag to be associated with the snapshot.
     * @returns {!promise.Promise<void>}
     */
    var checkCurrentFrame = function(eyes, matchTimeout, tag) {
        eyes._logger.verbose("CheckCurrentFrame(" + matchTimeout + ", '" + tag + "')");

        eyes._checkFrameOrElement = true;

        var ewds, image;
        eyes._logger.verbose("Getting screenshot as base64..");

        // FIXME - Scaling should be handled in a single place instead
        // return updateScalingParams(eyes).then(function () {
        //     return eyes._driver.getDefaultContentViewportSize(false);
        return eyes._driver.getDefaultContentViewportSize(false).then(function (viewportSize) {
            eyes._viewportSize = viewportSize;
            return eyes.getScreenShot();
        }).then(function (screenshotImage) {
        //     image = screenshotImage;
        //     return screenshotImage.getSize();
        // }).then(function (size) {
        //     eyes._viewportSize = null;
        //     var scale = eyes._scaleProvider.calculateScale(size.width);
        //     return image.scaleImage(scale);
        // }).then(function () {
            ewds = new EyesWebDriverScreenshot(eyes._logger, eyes._driver, screenshotImage);
            return ewds.buildScreenshot(null, null, null);
        }).then(function () {
            eyes._logger.verbose("Done!");
            eyes._viewportSize = null;
            return callCheckWindowBase(eyes, tag, false, matchTimeout, ewds.getFrameWindow());
        }).then(function () {
            eyes._checkFrameOrElement = false;
            eyes._regionToCheck = null;
        });
    };

    /**
     * Matches the frame given as parameter, by switching into the frame and
     * using stitching to get an image of the frame.
     *
     * @param {EyesRemoteWebElement} element The element which is the frame to switch to. (as
     * would be used in a call to driver.switchTo().frame() ).
     * @param {int} matchTimeout The amount of time to retry matching (milliseconds).
     * @param {string} tag An optional tag to be associated with the match.
     */
    Eyes.prototype.checkFrame = function(element, matchTimeout, tag) {
        var that = this;
        if (that._isDisabled) {
            this._logger.log("checkFrame(element, " + matchTimeout + ", '" + tag + "'): Ignored");
            return that._flow.execute(function() {
            });
        }

        ArgumentGuard.notNull(element, "frameReference");

        this._logger.log("CheckFrame(element, " + matchTimeout + ", '" + tag + "')");

        return that._flow.execute(function() {
            that._logger.verbose("Switching to frame based on element reference...");
            return that._driver.switchTo().frame(element)
              .then(function() {
                  that._logger.verbose("Done!");
                  return checkCurrentFrame(that, matchTimeout, tag);
              })
              .then(function() {
                  that._logger.verbose("Switching back to parent frame...");
                  // TODO: save all switching and restore parent
                  //return that._driver.switchTo().parentFrame();
                  return that._driver.switchTo().defaultContent();
              })
              .then(function() {
                  that._logger.verbose("Done!");
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
            return callCheckWindowBase(that, tag, false, matchTimeout, region);
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
                    return callCheckWindowBase(that, tag, false, matchTimeout, createRegion(point, size, true));
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
                    return callCheckWindowBase(that, tag, false, matchTimeout, createRegion(point, size, true));
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._waitTimeout = function(ms) {
        return this._flow.timeout(ms);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getScreenShot = function() {
        return BrowserUtils.getScreenshot(
            this._driver,
            this._promiseFactory,
            this._viewportSize,
            this._forceFullPage,
            this._hideScrollbars,
            this._stitchMode === Eyes.StitchMode.CSS,
            this._imageRotationDegrees,
            this._automaticRotation,
            this._os === 'Android' ? 90 : 270,
            this._isLandscape,
            this._waitBeforeScreenshots
        );
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
        return ViewportSize.setViewportSize(this._driver, size, this._promiseFactory, this._logger);
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

    //noinspection JSUnusedGlobalSymbols
    /**
     * Sets the wait time between before each screen capture, including between screen parts of a full page screenshot.
     *
     * @param waitBeforeScreenshots The wait time in milliseconds.
     */
    Eyes.prototype.setWaitBeforeScreenshots = function (waitBeforeScreenshots) {
        if (waitBeforeScreenshots <= 0) {
            this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;
        } else {
            this._waitBeforeScreenshots = waitBeforeScreenshots;
        }
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @returns {number|*} the wait time between before each screen capture, in milliseconds.
     */
    Eyes.prototype.getWaitBeforeScreenshots = function () {
        return this._waitBeforeScreenshots;
    };

    /**
     *
     * @returns {Promise} A promise which resolves to the webdriver's session ID.
     */
    Eyes.prototype.getAUTSessionId = function () {
        return this._promiseFactory.makePromise(function (resolve) {
            if (!this._driver) {
                resolve(undefined);
                return;
            }
            this._driver.getSession()
                .then(function (session) {
                    resolve(session.getId());
                });
        }.bind(this));
    };

    module.exports = Eyes;
}());
