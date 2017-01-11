/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [eyes.sdk, EyesWebDriver, ViewportSize, selenium-webdriver]

 ---
 */

(function () {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        promise = require('q'),
        EyesWebDriver = require('./EyesWebDriver'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        EyesWebDriverScreenshot = require('./EyesWebDriverScreenshot'),
        ElementFinderWrappers = require('./ElementFinderWrapper'),
        ScrollPositionProvider = require('./ScrollPositionProvider'),
        CssTranslatePositionProvider = require('./CssTranslatePositionProvider'),
        ElementPositionProvider = require('./ElementPositionProvider'),
        EyesRegionProvider = require('./EyesRegionProvider');
    var ElementFinderWrapper = ElementFinderWrappers.ElementFinderWrapper,
        ElementArrayFinderWrapper = ElementFinderWrappers.ElementArrayFinderWrapper,
        EyesBase = EyesSDK.EyesBase,
        FixedScaleProvider = EyesSDK.FixedScaleProvider,
        ContextBasedScaleProviderFactory = EyesSDK.ContextBasedScaleProviderFactory,
        FixedScaleProviderFactory = EyesSDK.FixedScaleProviderFactory,
        NullScaleProvider = EyesSDK.NullScaleProvider,
        CoordinatesType = EyesUtils.CoordinatesType,
        PromiseFactory = EyesUtils.PromiseFactory,
        BrowserUtils = EyesUtils.BrowserUtils,
        ArgumentGuard = EyesUtils.ArgumentGuard,
        MutableImage = EyesUtils.MutableImage,
        SimplePropertyHandler = EyesUtils.SimplePropertyHandler,
        ScaleProviderIdentityFactory = EyesUtils.ScaleProviderIdentityFactory,
        GeometryUtils = EyesUtils.GeometryUtils;
    var USE_DEFAULT_MATCH_TIMEOUT = -1,
        RESPONSE_TIME_DEFAULT_DEADLINE = 10,
        RESPONSE_TIME_DEFAULT_DIFF_FROM_DEADLINE = 20,
        DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100; // ms

    var UNKNOWN_DEVICE_PIXEL_RATIO = 0,
        DEFAULT_DEVICE_PIXEL_RATIO = 1;

    /**
     * @param {String} serverUrl
     * @param {Boolean} isDisabled - set to true to disable Applitools Eyes and use the webdriver directly.
     * @augments EyesBase
     * @constructor
     **/
    function Eyes(serverUrl, isDisabled) {
        this._forceFullPage = false;
        this._imageRotationDegrees = 0;
        this._automaticRotation = true;
        this._isLandscape = false;
        this._hideScrollbars = null;
        this._stitchMode = Eyes.StitchMode.Scroll;
        this._promiseFactory = new PromiseFactory();
        this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;

        EyesBase.call(this, this._promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
    }

    Eyes.UNKNOWN_DEVICE_PIXEL_RATIO = 0;
    Eyes.DEFAULT_DEVICE_PIXEL_RATIO = 1;

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    /**
     * @readonly
     * @enum {string}
     */
    Eyes.StitchMode = Object.freeze({
        // Uses scrolling to get to the different parts of the page.
        Scroll: 'Scroll',
        // Uses CSS transitions to get to the different parts of the page.
        CSS: 'CSS'
    });

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._getBaseAgentId = function () {
        return 'selenium-js/0.0.56';
    };

    function _init(that, flow) {
        // Set PromiseFactory to work with the protractor control flow and promises
        that._promiseFactory.setFactoryMethods(function (asyncAction) {
            return flow.execute(function () {
                var deferred = promise.defer();
                asyncAction(deferred.fulfill, deferred.reject);
                return deferred.promise;
            });
        }, function () {
            return promise.defer();
        });
    }

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.open = function (driver, appName, testName, viewportSize) {
        var that = this;

        if (typeof protractor !== 'undefined') {
            that._isProtratorLoaded = true;
            that._logger.verbose("Running using Protractor module");
        } else {
            that._isProtratorLoaded = false;
            that._logger.verbose("Running using Selenium module");
        }

        var flow = that._flow = driver.controlFlow();
        _init(that, flow);

        if (this._isDisabled) {
            return that._flow.execute(function () {
                return driver;
            });
        }

        return flow.execute(function () {
            return driver.getCapabilities()
                .then(function (capabilities) {
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
                .then(function () {
                    return EyesBase.prototype.open.call(that, appName, testName, viewportSize);
                }).then(function () {
                    that._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;
                    that._driver = new EyesWebDriver(driver, that, that._logger, that._promiseFactory);

                    // extend protractor element to return ours
                    if (that._isProtratorLoaded) {
                        var originalElementFn = global.element;
                        global.element = function (locator) {
                            return new ElementFinderWrapper(originalElementFn(locator), that._driver, that._logger);
                        };

                        global.element.all = function (locator) {
                            return new ElementArrayFinderWrapper(originalElementFn.all(locator), that._driver, that._logger);
                        };
                    }

                    that.setStitchMode(that._stitchMode);
                    return that._driver;
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.close = function (throwEx) {
        var that = this;

        if (this._isDisabled) {
            return that._flow.execute(function () {
            });
        }
        if (throwEx === undefined) {
            throwEx = true;
        }

        return that._flow.execute(function () {
            return EyesBase.prototype.close.call(that, throwEx)
                .then(function (results) {
                    return results;
                }, function (err) {
                    throw err;
                });
        });
    };

    /**
     * A helper function for calling the checkWindow on {@code EyesBase} and handling the result.
     * @param {Eyes} eyes The Eyes object (a derivative of EyesBase) on which to perform the call.
     * @param {String} tag The tag for the current visual checkpoint.
     * @param {boolean} ignoreMismatch Whether or not the server should ignore a mismatch.
     * @param {int} retryTimeout The timeout. (Milliseconds).
     * @param {RegionProvider} [regionProvider] The region to check. Should be of the form  {width, height, left, top}.
     * @returns {Promise} A promise which resolves to the checkWindow result, or an exception of the result failed
     *                      and failure reports are immediate.
     */
    var callCheckWindowBase = function (eyes, tag, ignoreMismatch, retryTimeout, regionProvider) {
        return EyesBase.prototype.checkWindow.call(eyes, tag, false, retryTimeout, regionProvider)
            .then(function (result) {
                if (result.asExpected || !eyes._failureReportOverridden) {
                    return result;
                } else {
                    throw EyesBase.buildTestError(result, eyes._sessionStartInfo.scenarioIdOrName,
                        eyes._sessionStartInfo.appIdOrName);
                }
            });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} tag
     * @param {int} matchTimeout
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkWindow = function (tag, matchTimeout) {
        var that = this;
        if (that._isDisabled) {
            return that._flow.execute(function () {
            });
        }
        return that._flow.execute(function () {
            that._regionToCheck = null;
            return callCheckWindowBase(that, tag, false, matchTimeout);
        });
    };

    /**
     * @param eyes
     * @returns {ScaleProviderFactory}
     */
    var updateScalingParams = function (eyes) {
        return eyes._promiseFactory.makePromise(function (resolve) {
            if (eyes._devicePixelRatio == UNKNOWN_DEVICE_PIXEL_RATIO && eyes._scaleProviderHandler.get() instanceof NullScaleProvider) {
                var factory, enSize, vpSize;
                eyes._logger.verbose("Trying to extract device pixel ratio...");

                return BrowserUtils.getDevicePixelRatio(eyes._driver, eyes._promiseFactory).then(function (ratio) {
                    eyes._devicePixelRatio = ratio;
                }, function (err) {
                    eyes._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
                    eyes._devicePixelRatio = DEFAULT_DEVICE_PIXEL_RATIO;
                }).then(function () {
                    eyes._logger.verbose("Device pixel ratio: " + eyes._devicePixelRatio);
                    eyes._logger.verbose("Setting scale provider..");
                    return eyes._positionProvider.getEntireSize();
                }).then(function (entireSize) {
                    enSize = entireSize;
                    return eyes.getViewportSize();
                }).then(function (viewportSize) {
                    vpSize = viewportSize;
                    factory = new ContextBasedScaleProviderFactory(enSize, vpSize, eyes._devicePixelRatio, eyes._scaleProviderHandler);
                }, function (err) {
                    // This can happen in Appium for example.
                    eyes._logger.verbose("Failed to set ContextBasedScaleProvider.", err);
                    eyes._logger.verbose("Using FixedScaleProvider instead...");
                    factory = new FixedScaleProviderFactory(1/eyes._devicePixelRatio, eyes._scaleProviderHandler);
                }).then(function () {
                    eyes._logger.verbose("Done!");
                    resolve(factory);
                });
            }

            // If we already have a scale provider set, we'll just use it, and pass a mock as provider handler.
            resolve(new ScaleProviderIdentityFactory(eyes._scaleProviderHandler.get(), new SimplePropertyHandler()));
        });
    };

    /**
     * Verifies the current frame.
     *
     * @param eyes
     * @param {int} matchTimeout The amount of time to retry matching.
     *                     (Milliseconds)
     * @param {string} tag An optional tag to be associated with the snapshot.
     * @returns {Promise<void>}
     */
    var checkCurrentFrame = function (eyes, matchTimeout, tag) {
        eyes._logger.verbose("CheckCurrentFrame(" + matchTimeout + ", '" + tag + "')");

        eyes._checkFrameOrElement = true;
        eyes._logger.verbose("Getting screenshot as base64..");

        var ewds, sHideScrollBars, scaleProviderFactory;

        return updateScalingParams(eyes).then(function (factory) {
            scaleProviderFactory = factory;
            return eyes._driver.takeScreenshot();
        }).then(function (screenshot64) {
            return new MutableImage(new Buffer(screenshot64, 'base64'), eyes._promiseFactory);
        }).then(function (image) {
            return image.getSize();
        }).then(function (imageSize) {
            var scaleProvider = scaleProviderFactory.getScaleProvider(imageSize.width);
            return image.scaleImage(scaleProvider.getScaleRatio());
        }).then(function (scaledImage) {
            ewds = new EyesWebDriverScreenshot(eyes._logger, eyes._driver, scaledImage, eyes._promiseFactory);
            ewds.buildScreenshot();
        }).then(function () {
            eyes._logger.verbose("Done!");
            sHideScrollBars = eyes._hideScrollbars;
            eyes._hideScrollbars = true;
            eyes._regionToCheck = ewds.getFrameWindow();
            return callCheckWindowBase(eyes, tag, false, matchTimeout);
        }).then(function () {
            eyes._hideScrollbars = sHideScrollBars;
            eyes._regionToCheck = null;
            eyes._checkFrameOrElement = false;
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Matches the frame given as parameter, by switching into the frame and
     * using stitching to get an image of the frame.
     *
     * @param {EyesRemoteWebElement} element The element which is the frame to switch to. (as
     * would be used in a call to driver.switchTo().frame() ).
     * @param {int} matchTimeout The amount of time to retry matching (milliseconds).
     * @param {string} tag An optional tag to be associated with the match.
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkFrame = function (element, matchTimeout, tag) {
        var that = this;
        if (that._isDisabled) {
            this._logger.log("checkFrame(element, " + matchTimeout + ", '" + tag + "'): Ignored");
            return that._flow.execute(function () {
            });
        }

        ArgumentGuard.notNull(element, "frameReference");
        this._logger.log("CheckFrame(element, " + matchTimeout + ", '" + tag + "')");

        return that._flow.execute(function () {
            that._logger.verbose("Switching to frame based on element reference...");
            return that._driver.switchTo().frame(element)
                .then(function () {
                    that._logger.verbose("Done!");
                    return checkCurrentFrame(that, matchTimeout, tag);
                })
                .then(function () {
                    that._logger.verbose("Switching back to parent frame...");
                    return that._driver.switchTo().parentFrame();
                })
                .then(function () {
                    that._logger.verbose("Done!");
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Takes a snapshot of the application under test and matches a specific
     * element with the expected region output.
     *
     * @param {webdriver.WebElement|EyesRemoteWebElement} element The element to check.
     * @param {int|null} matchTimeout The amount of time to retry matching (milliseconds).
     * @param {string} tag An optional tag to be associated with the match.
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkElement = function (element, matchTimeout, tag) {
        var that = this;
        if (that._isDisabled) {
            this._logger.log("checkElement(element, " + matchTimeout + ", '" + tag + "'): Ignored");
            return that._flow.execute(function () {
            });
        }

        ArgumentGuard.notNull(element, "frameReference");
        this._logger.log("checkElement(element, " + matchTimeout + ", '" + tag + "')");

        return that._flow.execute(function () {

            var originalOverflow, elLocation, elSize,
                borderLeftWidth, borderRightWidth, borderTopWidth, borderBottomWidth;

            that._checkFrameOrElement = true;

            var originalPositionProvider = that.getPositionProvider();
            that.setPositionProvider(new ElementPositionProvider(that._logger, that._driver, element, that._promiseFactory));

            // Set overflow to "hidden".
            return element.getOverflow().then(function (value) {
                originalOverflow = value;
                return element.setOverflow("hidden");
            }).then(function () {
                return element.getLocation();
            }).then(function (value) {
                elLocation = value;
                return element.getSize();
            }).then(function (value) {
                elSize = value;
                return element.getBorderLeftWidth();
            }).then(function (value) {
                borderLeftWidth = value;
                return element.getBorderRightWidth();
            }).then(function (value) {
                borderRightWidth = value;
                return element.getBorderTopWidth();
            }).then(function (value) {
                borderTopWidth = value;
                return element.getBorderBottomWidth();
            }).then(function (value) {
                borderBottomWidth = value;

                var region = GeometryUtils.createRegion(
                    elLocation.y + borderTopWidth,
                    elLocation.x + borderLeftWidth,
                    elSize.width - borderLeftWidth - borderRightWidth,
                    elSize.height - borderTopWidth - borderBottomWidth
                );
                that._regionToCheck = new EyesRegionProvider(that._logger, that._driver, region, CoordinatesType.CONTEXT_RELATIVE);

                that._logger.verbose("Element region: ", that._regionToCheck.getRegion());
                return callCheckWindowBase(that, tag, false, matchTimeout);
            }).then(function () {
                if (originalOverflow != null) {
                    return element.setOverflow(originalOverflow);
                }
            }).then(function () {
                that._checkFrameOrElement = false;
                that.setPositionProvider(originalPositionProvider);
                that._regionToCheck = null;
            });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Takes a snapshot of the application under test and matches a specific
     * element with the expected region output.
     *
     * @param {webdriver.by} locator The element to check.
     * @param {int|null} matchTimeout The amount of time to retry matching (milliseconds).
     * @param {string} tag An optional tag to be associated with the match.
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkElementBy = function (locator, matchTimeout, tag) {
        var that = this;
        ArgumentGuard.notNull(locator, "locator");
        return that._flow.execute(function () {
            return that._driver.findElement(locator).then(function (element) {
                return that.checkElement(element, matchTimeout, tag);
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
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegion = function (region, tag, matchTimeout) {
        var that = this;
        if (this._isDisabled) {
            return that._flow.execute(function () {
            });
        }
        return that._flow.execute(function () {
            that._regionToCheck = null;
            var regionProvider = new EyesRegionProvider(that._logger, that._driver, region, CoordinatesType.CONTEXT_AS_IS);
            return callCheckWindowBase(that, tag, false, matchTimeout, regionProvider);
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     *
     * @param {webdriver.WebElement|EyesRemoteWebElement} element The element defining the region to validate.
     * @param {string} tag An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout The amount of time to retry matching.
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionByElement = function (element, tag, matchTimeout) {
        var that = this;
        var size;
        if (this._isDisabled) {
            return that._flow.execute(function () {
            });
        }
        return that._flow.execute(function () {
            return element.getSize()
                .then(function (elementSize) {
                    size = elementSize;
                    return element.getLocation();
                })
                .then(function (point) {
                    that._regionToCheck = null;
                    var region = GeometryUtils.createRegionFromLocationAndSize(point, size);
                    var regionProvider = new EyesRegionProvider(that._logger, that._driver, region, CoordinatesType.CONTEXT_RELATIVE);
                    return callCheckWindowBase(that, tag, false, matchTimeout, regionProvider);
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
     * @return {ManagedPromise<void>} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionBy = function (by, tag, matchTimeout) {
        var that = this;
        return that._flow.execute(function () {
            return that._driver.findElement(by).then(function (elem) {
                return that.checkRegionByElement(elem, tag, matchTimeout);
            })
        });
    };

    /**
     * Switches into the given frame, takes a snapshot of the application under
     * test and matches a region specified by the given selector.
     *
     * @param {string} frameNameOrId The name or id of the frame to switch to. (as would be used in a call to driver.switchTo().frame()).
     * @param {webdriver.By} locator A Selector specifying the region to check.
     * @param {int|null} matchTimeout  The amount of time to retry matching. (Milliseconds)
     * @param {string} tag An optional tag to be associated with the snapshot.
     * @param {boolean} stitchContent If {@code true}, stitch the internal content of the region (i.e., perform
     *                  {@link #checkElement(By, int, String)} on the region.
     */
    Eyes.prototype.checkRegionInFrame = function (frameNameOrId, locator, matchTimeout, tag, stitchContent) {
        var that = this;
        if (that._isDisabled) {
            this._logger.log("checkRegionInFrame(element, selector, ", matchTimeout, ", ", tag, "): Ignored");
            return that._flow.execute(function () {
            });
        }

        this._logger.log("checkRegionInFrame(element, selector, ", matchTimeout, ", ", tag, ")");

        return that._flow.execute(function () {
            that._logger.verbose("Switching to frame based on element reference...");
            return that._driver.switchTo().frame(frameNameOrId)
                .then(function () {
                    that._logger.verbose("Done!");
                    return that._driver.findElement(locator);
                })
                .then(function (element) {
                    if (stitchContent) {
                        return that.checkElement(element, matchTimeout, tag);
                    } else {
                        return that.checkRegionByElement(element, tag, matchTimeout);
                    }
                })
                .then(function () {
                    that._logger.verbose("Switching back to parent frame...");
                    return that._driver.switchTo().parentFrame();
                })
                .then(function () {
                    that._logger.verbose("Done!");
                });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._waitTimeout = function (ms) {
        return this._flow.timeout(ms);
    };

    /**
     * @returns {Promise.<MutableImage>}
     */
    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getScreenShot = function () {
        var that = this;
        return updateScalingParams(that).then(function (factory) {
            return BrowserUtils.getScreenshot(
                that._driver,
                that._promiseFactory,
                that._viewportSize,
                that._positionProvider,
                factory,
                that._forceFullPage,
                that._hideScrollbars,
                that._stitchMode === Eyes.StitchMode.CSS,
                that._imageRotationDegrees,
                that._automaticRotation,
                that._os === 'Android' ? 90 : 270,
                that._isLandscape,
                that._waitBeforeScreenshots,
                that._checkFrameOrElement,
                that._regionToCheck,
                that._saveDebugScreenshots,
                that._debugScreenshotsPath
            );
        });
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getTitle = function () {
        return this._driver.getTitle();
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getInferredEnvironment = function () {
        var res = 'useragent:';
        return this._driver.executeScript('return navigator.userAgent')
            .then(function (userAgent) {
                return res + userAgent;
            }, function () {
                return res;
            });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param mode Use one of the values in EyesBase.FailureReport.
     */
    Eyes.prototype.setFailureReport = function (mode) {
        if (mode === EyesBase.FailureReport.Immediate) {
            this._failureReportOverridden = true;
            mode = EyesBase.FailureReport.OnClose;
        }

        EyesBase.prototype.setFailureReport.call(this, mode);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getViewportSize = function () {
        return BrowserUtils.getViewportSizeOrDisplaySize(this._logger, this._driver, this._promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setViewportSize = function (size) {
        return BrowserUtils.setViewportSize(this._logger, this._driver, size, this._promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setForceFullPageScreenshot = function (force) {
        this._forceFullPage = force;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getForceFullPageScreenshot = function () {
        return this._forceFullPage;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setForcedImageRotation = function (degrees) {
        if (typeof degrees != 'number') {
            throw new TypeError('degrees must be a number! set to 0 to clear');
        }
        this._imageRotationDegrees = degrees;
        this._automaticRotation = false;
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.getForcedImageRotation = function () {
        return this._imageRotationDegrees || 0;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {boolean} hide
     */
    Eyes.prototype.setHideScrollbars = function (hide) {
        this._hideScrollbars = hide;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @return {boolean|null}
     */
    Eyes.prototype.getHideScrollbars = function () {
        return this._hideScrollbars;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {Eyes.StitchMode} mode
     */
    Eyes.prototype.setStitchMode = function (mode) {
        this._stitchMode = mode;
        if (this._driver != null) {
            switch (mode) {
                case Eyes.StitchMode.CSS:
                    this.setPositionProvider(new CssTranslatePositionProvider(this._logger, this._driver, this._promiseFactory));
                    break;
                default:
                    this.setPositionProvider(new ScrollPositionProvider(this._logger, this._driver, this._promiseFactory));
            }
        }
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @return {Eyes.StitchMode} The currently set StitchMode.
     */
    Eyes.prototype.getStitchMode = function () {
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

    //noinspection JSUnusedGlobalSymbols
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
