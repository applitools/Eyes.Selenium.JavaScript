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

    var promise = require('q'),
        webdriver = require('selenium-webdriver'),
        EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        EyesWebDriver = require('./EyesWebDriver'),
        EyesSeleniumUtils = require('./EyesSeleniumUtils'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        EyesWebDriverScreenshot = require('./EyesWebDriverScreenshot'),
        ElementFinderWrapper = require('./ElementFinderWrappers').ElementFinderWrapper,
        ElementArrayFinderWrapper = require('./ElementFinderWrappers').ElementArrayFinderWrapper,
        ScrollPositionProvider = require('./ScrollPositionProvider'),
        CssTranslatePositionProvider = require('./CssTranslatePositionProvider'),
        ElementPositionProvider = require('./ElementPositionProvider'),
        EyesRegionProvider = require('./EyesRegionProvider'),
        Target = require('./Target');
    var EyesBase = EyesSDK.EyesBase,
        FixedScaleProvider = EyesSDK.FixedScaleProvider,
        ContextBasedScaleProviderFactory = EyesSDK.ContextBasedScaleProviderFactory,
        FixedScaleProviderFactory = EyesSDK.FixedScaleProviderFactory,
        NullScaleProvider = EyesSDK.NullScaleProvider,
        Logger = EyesSDK.Logger,
        CoordinatesType = EyesSDK.CoordinatesType,
        MutableImage = EyesSDK.MutableImage,
        ScaleProviderIdentityFactory = EyesSDK.ScaleProviderIdentityFactory,
        PromiseFactory = EyesUtils.PromiseFactory,
        ArgumentGuard = EyesUtils.ArgumentGuard,
        SimplePropertyHandler = EyesUtils.SimplePropertyHandler,
        GeometryUtils = EyesUtils.GeometryUtils;

    var DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100, // ms
        UNKNOWN_DEVICE_PIXEL_RATIO = 0,
        DEFAULT_DEVICE_PIXEL_RATIO = 1;

    /**
     * @readonly
     * @enum {string}
     */
    var StitchMode = {
        // Uses scrolling to get to the different parts of the page.
        Scroll: 'Scroll',

        // Uses CSS transitions to get to the different parts of the page.
        CSS: 'CSS'
    };

    /**
     * Initializes an Eyes instance.
     * @param {String} [serverUrl] - The Eyes server URL.
     * @param {Boolean} [isDisabled] - set to true to disable Applitools Eyes and use the webdriver directly.
     * @augments EyesBase
     * @constructor
     **/
    function Eyes(serverUrl, isDisabled) {
        this._forceFullPage = false;
        this._imageRotationDegrees = 0;
        this._automaticRotation = true;
        this._isLandscape = false;
        this._hideScrollbars = null;
        this._checkFrameOrElement = false;
        this._stitchMode = StitchMode.Scroll;
        this._promiseFactory = new PromiseFactory();
        this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;

        EyesBase.call(this, this._promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._getBaseAgentId = function () {
        return 'selenium-js/0.0.72';
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
    /**
     * Starts a test.
     * @param {WebDriver} driver - The web driver that controls the browser hosting the application under test.
     * @param {string} appName - The name of the application under test.
     * @param {string} testName - The test name.
     * @param {{width: number, height: number}} viewportSize - The required browser's
     * viewport size (i.e., the visible part of the document's body) or to use the current window's viewport.
     * @return {Promise<WebDriver>} A wrapped WebDriver which enables Eyes trigger recording and
     * frame handling.
     */
    Eyes.prototype.open = function (driver, appName, testName, viewportSize) {
        var that = this;

        that._flow = driver.controlFlow();
        _init(that, that._flow);

        if (typeof protractor !== 'undefined') {
            that._isProtractorLoaded = true;
            that._logger.verbose("Running using Protractor module");

            // extend protractor element to return ours
            var originalElementFn = global.element;
            global.element = function (locator) {
                return new ElementFinderWrapper(originalElementFn(locator), that._driver, that._logger);
            };

            global.element.all = function (locator) {
                return new ElementArrayFinderWrapper(originalElementFn.all(locator), that._driver, that._logger);
            };
        } else {
            that._isProtractorLoaded = false;
            that._logger.verbose("Running using Selenium module");
        }

        that._devicePixelRatio = UNKNOWN_DEVICE_PIXEL_RATIO;
        that._driver = new EyesWebDriver(driver, that, that._logger, that._promiseFactory);
        that.setStitchMode(that._stitchMode);

        if (this._isDisabled) {
            return that._flow.execute(function () {
                return driver;
            });
        }

        return that._flow.execute(function () {
            return driver.getCapabilities().then(function (capabilities) {
                var platformName, platformVersion, orientation;
                if (capabilities.caps_) {
                    platformName = capabilities.caps_.platformName;
                    platformVersion = capabilities.caps_.platformVersion;
                    orientation = capabilities.caps_.orientation || capabilities.caps_.deviceOrientation;
                } else {
                    platformName = capabilities.get('platform') || capabilities.get('platformName');
                    platformVersion = capabilities.get('version') || capabilities.get('platformVersion');
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
            }).then(function () {
                return EyesBase.prototype.open.call(that, appName, testName, viewportSize);
            }).then(function () {
                return that._driver;
            });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Ends the test.
     * @param throwEx - If true, an exception will be thrown for failed/new tests.
     * @returns {*} The test results.
     */
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

    //noinspection JSUnusedGlobalSymbols
    /**
     * Preform visual validation
     * @param {string} name - A name to be associated with the match
     * @param {Target} target - Target instance which describes whether we want a window/region/frame
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.check = function (name, target) {
        ArgumentGuard.notNullOrEmpty(name, "Name");
        ArgumentGuard.notNull(target, "Target");

        var that = this;

        var promise = that._promiseFactory.makePromise(function (resolve) {
            resolve();
        });

        if (that._isDisabled) {
            that._logger.verbose("match ignored - ", name);
            return promise;
        }

        if (target.getIgnoreObjects().length) {
            target.getIgnoreObjects().forEach(function (obj) {
                promise = promise.then(function() {
                    return findElementByLocator(that, obj.element);
                }).then(function (element) {
                    if (!isElementObject(element)) {
                        throw new Error("Unsupported ignore region type: " + typeof element);
                    }

                    return getRegionFromWebElement(element);
                }).then(function (region) {
                    target.ignore(region);
                });
            });
        }

        if (target.getFloatingObjects().length) {
            target.getFloatingObjects().forEach(function (obj) {
                promise = promise.then(function() {
                    return findElementByLocator(that, obj.element);
                }).then(function (element) {
                    if (!isElementObject(element)) {
                        throw new Error("Unsupported floating region type: " + typeof element);
                    }

                    return getRegionFromWebElement(element);
                }).then(function (region) {
                    region.maxLeftOffset = obj.maxLeftOffset;
                    region.maxRightOffset = obj.maxRightOffset;
                    region.maxUpOffset = obj.maxUpOffset;
                    region.maxDownOffset = obj.maxDownOffset;
                    target.floating(region);
                });
            });
        }

        that._logger.verbose("match starting with params", name, target.getStitchContent(), target.getTimeout());
        var regionObject,
            regionProvider,
            isFrameSwitched = false, // if we will switch frame then we need to restore parent
            originalForceFullPage, originalOverflow, originalPositionProvider, originalHideScrollBars;

        if (target.getStitchContent()) {
            originalForceFullPage = that._forceFullPage;
            that._forceFullPage = true;
        }

        // If frame specified
        if (target.isUsingFrame()) {
            promise = promise.then(function () {
                return findElementByLocator(that, target.getFrame());
            }).then(function (frame) {
                that._logger.verbose("Switching to frame...");
                return that._driver.switchTo().frame(frame);
            }).then(function () {
                isFrameSwitched = true;
                that._logger.verbose("Done!");

                // if we need to check entire frame, we need to update region provider
                if (!target.isUsingRegion()) {
                    that._checkFrameOrElement = true;
                    originalHideScrollBars = that._hideScrollbars;
                    that._hideScrollbars = true;
                    return getRegionProviderForCurrentFrame(that).then(function (regionProvider) {
                        that._regionToCheck = regionProvider;
                    });
                }
            });
        }

        // if region specified
        if (target.isUsingRegion()) {
            promise = promise.then(function () {
                return findElementByLocator(that, target.getRegion());
            }).then(function (region) {
                regionObject = region;

                if (isElementObject(regionObject)) {
                    var regionPromise;
                    if (target.getStitchContent()) {
                        that._checkFrameOrElement = true;

                        originalPositionProvider = that.getPositionProvider();
                        that.setPositionProvider(new ElementPositionProvider(that._logger, that._driver, regionObject, that._promiseFactory));

                        // Set overflow to "hidden".
                        regionPromise = regionObject.getOverflow().then(function (value) {
                            originalOverflow = value;
                            return regionObject.setOverflow("hidden");
                        }).then(function () {
                            return getRegionProviderForElement(that, regionObject);
                        }).then(function (regionProvider) {
                            that._regionToCheck = regionProvider;
                        });
                    } else {
                        regionPromise = getRegionFromWebElement(regionObject);
                    }

                    return regionPromise.then(function (region) {
                        regionProvider = new EyesRegionProvider(that._logger, that._driver, region, CoordinatesType.CONTEXT_RELATIVE);
                    });
                } else if (GeometryUtils.isRegion(regionObject)) {
                    // if regionObject is simple region
                    regionProvider = new EyesRegionProvider(that._logger, that._driver, regionObject, CoordinatesType.CONTEXT_AS_IS);
                } else {
                    throw new Error("Unsupported region type: " + typeof regionObject);
                }
            });
        }

        return promise.then(function () {
            that._logger.verbose("Call to checkWindowBase...");
            var imageMatchSettings = {
                matchLevel: target.getMatchLevel(),
                ignoreCaret: target.getIgnoreCaret(),
                ignore: target.getIgnoreRegions(),
                floating: target.getFloatingRegions(),
                exact: null
            };
            return EyesBase.prototype.checkWindow.call(that, name, target.getIgnoreMismatch(), target.getTimeout(), regionProvider, imageMatchSettings);
        }).then(function (result) {
            that._logger.verbose("Processing results...");
            if (result.asExpected || !that._failureReportOverridden) {
                return result;
            } else {
                throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName, that._sessionStartInfo.appIdOrName);
            }
        }).then(function () {
            that._logger.verbose("Done!");
            that._logger.verbose("Restoring temporal variables...");

            if (that._regionToCheck) {
                that._regionToCheck = null;
            }

            if (that._checkFrameOrElement) {
                that._checkFrameOrElement = false;
            }

            // restore initial values
            if (originalForceFullPage !== undefined) {
                that._forceFullPage = originalForceFullPage;
            }

            if (originalHideScrollBars !== undefined) {
                that._hideScrollbars = originalHideScrollBars;
            }

            if (originalPositionProvider !== undefined) {
                that.setPositionProvider(originalPositionProvider);
            }

            if (originalOverflow !== undefined) {
                return regionObject.setOverflow(originalOverflow);
            }
        }).then(function () {
            that._logger.verbose("Done!");

            // restore parent frame, if another frame was selected
            if (isFrameSwitched) {
                that._logger.verbose("Switching back to parent frame...");
                return that._driver.switchTo().parentFrame().then(function () {
                    that._logger.verbose("Done!");
                });
            }
        });
    };

    var findElementByLocator = function (that, elementObject) {
        return that._promiseFactory.makePromise(function (resolve) {
            if (isLocatorObject(elementObject)) {
                that._logger.verbose("Trying to find element...", elementObject);
                return resolve(that._driver.findElement(elementObject));
            } else if (elementObject instanceof ElementFinderWrapper) {
                return resolve(elementObject.getWebElement());
            }

            resolve(elementObject);
        });
    };

    var isElementObject = function (o) {
        return o instanceof EyesRemoteWebElement;
    };

    var isLocatorObject = function (o) {
        return o instanceof webdriver.By || o.findElementsOverride !== undefined || (o.using !== undefined && o.value !== undefined);
    };

    /**
     * Get the region provider for a certain element.
     * @param {Eyes} eyes - The eyes instance.
     * @param {EyesRemoteWebElement|webdriver.WebElement} element - The element to get a region for.
     * @return {Promise<EyesRegionProvider>} The region for a certain element.
     */
    var getRegionProviderForElement = function (eyes, element) {
        var elementLocation, elementSize,
            borderLeftWidth, borderRightWidth, borderTopWidth;

        eyes._logger.verbose("getRegionProviderForElement");
        return element.getLocation().then(function (value) {
            elementLocation = value;
            return element.getSize();
        }).then(function (value) {
            elementSize = value;
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
        }).then(function (value) { // borderBottomWidth
            var elementRegion = GeometryUtils.createRegion(
                elementLocation.x + borderLeftWidth,
                elementLocation.y + borderTopWidth,
                elementSize.width - borderLeftWidth - borderRightWidth,
                elementSize.height - borderTopWidth - value
            );

            eyes._logger.verbose("Done! Element region", elementRegion);
            return new EyesRegionProvider(eyes._logger, eyes._driver, elementRegion, CoordinatesType.CONTEXT_RELATIVE);
        });
    };

    /**
     * Get region provider for the current frame.
     * @param {Eyes} eyes - The eyes instance.
     * @return {Promise<EyesRegionProvider>} The region provider for the certain frame.
     */
    var getRegionProviderForCurrentFrame = function (eyes) {
        var screenshot, scaleProviderFactory, mutableImage;
        eyes._logger.verbose("getRegionProviderForCurrentFrame");
        return eyes.updateScalingParams().then(function (factory) {
            scaleProviderFactory = factory;
            eyes._logger.verbose("Getting screenshot as base64...");
            return eyes._driver.takeScreenshot();
        }).then(function (image64) {
            return MutableImage.fromBase64(image64, eyes._promiseFactory);
        }).then(function (image) {
            mutableImage = image;
            return mutableImage.getSize();
        }).then(function (imageSize) {
            eyes._logger.verbose("Scaling image...");
            var scaleProvider = scaleProviderFactory.getScaleProvider(imageSize.width);
            return mutableImage.scaleImage(scaleProvider.getScaleRatio());
        }).then(function (scaledImage) {
            eyes._logger.verbose("Done! Building required object...");
            screenshot = new EyesWebDriverScreenshot(eyes._logger, eyes._driver, scaledImage, eyes._promiseFactory);
            return screenshot.buildScreenshot();
        }).then(function () {
            var frameRegion = screenshot.getFrameWindow();
            eyes._logger.verbose("Done! Frame region", frameRegion);
            return new EyesRegionProvider(eyes._logger, eyes._driver, frameRegion, CoordinatesType.SCREENSHOT_AS_IS);
        })
    };

    /**
     * Get the region for a certain web element.
     * @param {EyesRemoteWebElement|webdriver.WebElement} element - The web element to get the region from.
     * @return {Promise<{left: number, top: number, width: number, height: number}>} The region.
     */
    var getRegionFromWebElement = function (element) {
        var elementSize;
        return element.getSize().then(function (size) {
            elementSize = size;
            return element.getLocation();
        }).then(function (point) {
            return GeometryUtils.createRegionFromLocationAndSize(point, elementSize);
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Takes a snapshot of the application under test and matches it with
     * the expected output.
     * @param {string} tag - An optional tag to be associated with the snapshot.
     * @param {int} matchTimeout - The amount of time to retry matching (Milliseconds).
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkWindow = function (tag, matchTimeout) {
        return this.check(tag, Target.window().timeout(matchTimeout));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Matches the frame given as parameter, by switching into the frame and
     * using stitching to get an image of the frame.
     * @param {EyesRemoteWebElement} - element The element which is the frame to switch to. (as
     * would be used in a call to driver.switchTo().frame() ).
     * @param {int} matchTimeout - The amount of time to retry matching (milliseconds).
     * @param {string} tag - An optional tag to be associated with the match.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkFrame = function (element, matchTimeout, tag) {
        return this.check(tag, Target.frame(element).timeout(matchTimeout));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Takes a snapshot of the application under test and matches a specific
     * element with the expected region output.
     * @param {webdriver.WebElement|EyesRemoteWebElement} element - The element to check.
     * @param {int|null} matchTimeout - The amount of time to retry matching (milliseconds).
     * @param {string} tag - An optional tag to be associated with the match.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkElement = function (element, matchTimeout, tag) {
        return this.check(tag, Target.region(element).timeout(matchTimeout).fully());
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Takes a snapshot of the application under test and matches a specific
     * element with the expected region output.
     * @param {webdriver.By} locator - The element to check.
     * @param {int|null} matchTimeout - The amount of time to retry matching (milliseconds).
     * @param {string} tag - An optional tag to be associated with the match.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkElementBy = function (locator, matchTimeout, tag) {
        return this.check(tag, Target.region(locator).timeout(matchTimeout).fully());
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     * @param {{left: number, top: number, width: number, height: number}} region - The region to
     * validate (in screenshot coordinates).
     * @param {string} tag - An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout - The amount of time to retry matching.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegion = function (region, tag, matchTimeout) {
        return this.check(tag, Target.region(region).timeout(matchTimeout));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     * @param {webdriver.WebElement|EyesRemoteWebElement} element - The element defining the region to validate.
     * @param {string} tag - An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout - The amount of time to retry matching.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionByElement = function (element, tag, matchTimeout) {
        return this.check(tag, Target.region(element).timeout(matchTimeout));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Visually validates a region in the screenshot.
     * @param {webdriver.By} by - The WebDriver selector used for finding the region to validate.
     * @param {string} tag - An optional tag to be associated with the screenshot.
     * @param {int} matchTimeout - The amount of time to retry matching.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionBy = function (by, tag, matchTimeout) {
        return this.check(tag, Target.region(by).timeout(matchTimeout));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Switches into the given frame, takes a snapshot of the application under
     * test and matches a region specified by the given selector.
     * @param {string} frameNameOrId - The name or id of the frame to switch to. (as would be used in a call to driver.switchTo().frame()).
     * @param {webdriver.By} locator - A Selector specifying the region to check.
     * @param {int|null} matchTimeout - The amount of time to retry matching. (Milliseconds)
     * @param {string} tag - An optional tag to be associated with the snapshot.
     * @param {boolean} stitchContent - If {@code true}, stitch the internal content of the region (i.e., perform
     *                  {@link #checkElement(By, int, String)} on the region.
     * @return {ManagedPromise} A promise which is resolved when the validation is finished.
     */
    Eyes.prototype.checkRegionInFrame = function (frameNameOrId, locator, matchTimeout, tag, stitchContent) {
        return this.check(tag, Target.region(locator, frameNameOrId).timeout(matchTimeout).fully(stitchContent));
    };

    /**
     * @protected
     * @returns {ScaleProviderFactory}
     */
    Eyes.prototype.updateScalingParams = function () {
        var that = this;
        return that._promiseFactory.makePromise(function (resolve) {
            if (that._devicePixelRatio === UNKNOWN_DEVICE_PIXEL_RATIO && that._scaleProviderHandler.get() instanceof NullScaleProvider) {
                var factory, enSize, vpSize;
                that._logger.verbose("Trying to extract device pixel ratio...");

                return EyesSeleniumUtils.getDevicePixelRatio(that._driver, that._promiseFactory).then(function (ratio) {
                    that._devicePixelRatio = ratio;
                }, function (err) {
                    that._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
                    that._devicePixelRatio = DEFAULT_DEVICE_PIXEL_RATIO;
                }).then(function () {
                    that._logger.verbose("Device pixel ratio: " + that._devicePixelRatio);
                    that._logger.verbose("Setting scale provider..");
                    return that._positionProvider.getEntireSize();
                }).then(function (entireSize) {
                    enSize = entireSize;
                    return that.getViewportSize();
                }).then(function (viewportSize) {
                    vpSize = viewportSize;
                    factory = new ContextBasedScaleProviderFactory(enSize, vpSize, that._devicePixelRatio, that._scaleProviderHandler);
                }, function (err) {
                    // This can happen in Appium for example.
                    that._logger.verbose("Failed to set ContextBasedScaleProvider.", err);
                    that._logger.verbose("Using FixedScaleProvider instead...");
                    factory = new FixedScaleProviderFactory(1/that._devicePixelRatio, that._scaleProviderHandler);
                }).then(function () {
                    that._logger.verbose("Done!");
                    resolve(factory);
                });
            }

            // If we already have a scale provider set, we'll just use it, and pass a mock as provider handler.
            resolve(new ScaleProviderIdentityFactory(that._scaleProviderHandler.get(), new SimplePropertyHandler()));
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get an updated screenshot.
     * @returns {Promise.<MutableImage>} - The image of the new screenshot.
     */
    Eyes.prototype.getScreenShot = function () {
        var that = this;
        return that.updateScalingParams().then(function (scaleProviderFactory) {
            return EyesSeleniumUtils.getScreenshot(
                that._driver,
                that._promiseFactory,
                that._viewportSize,
                that._positionProvider,
                scaleProviderFactory,
                that._cutProviderHandler.get(),
                that._forceFullPage,
                that._hideScrollbars,
                that._stitchMode === StitchMode.CSS,
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
    Eyes.prototype._waitTimeout = function (ms) {
        return this._flow.timeout(ms);
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
     * Set the failure report.
     * @param mode - Use one of the values in EyesBase.FailureReport.
     */
    Eyes.prototype.setFailureReport = function (mode) {
        if (mode === EyesBase.FailureReport.Immediate) {
            this._failureReportOverridden = true;
            mode = EyesBase.FailureReport.OnClose;
        }

        EyesBase.prototype.setFailureReport.call(this, mode);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the viewport size.
     * @returns {*} The viewport size.
     */
    Eyes.prototype.getViewportSize = function () {
        return EyesSeleniumUtils.getViewportSizeOrDisplaySize(this._logger, this._driver, this._promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype.setViewportSize = function (size) {
        return EyesSeleniumUtils.setViewportSize(this._logger, this._driver, size, this._promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Set the viewport size using the driver. Call this method if for some reason
     * you don't want to call {@link #open(WebDriver, String, String)} (or one of its variants) yet.
     * @param {WebDriver} driver - The driver to use for setting the viewport.
     * @param {{width: number, height: number}} size - The required viewport size.
     * @return {Promise<void>} The viewport size of the browser.
     */
    Eyes.setViewportSize = function (driver, size) {
        var promiseFactory = new PromiseFactory();
        promiseFactory.setFactoryMethods(function (asyncAction) {
            var deferred = promise.defer();
            asyncAction(deferred.fulfill, deferred.reject);
            return deferred.promise;
        }, function () {
            return promise.defer();
        });

        return EyesSeleniumUtils.setViewportSize(new Logger(), driver, size, promiseFactory);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Set the full page screenshot option.
     * @param {boolean} force - Whether to force a full page screenshot or not.
     * @return {void}
     */
    Eyes.prototype.setForceFullPageScreenshot = function (force) {
        this._forceFullPage = force;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get whether to force a full page screenshot or not.
     * @return {boolean} true if the option is on, otherwise false.
     */
    Eyes.prototype.getForceFullPageScreenshot = function () {
        return this._forceFullPage;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Set the image rotation degrees.
     * @param degrees - The amount of degrees to set the rotation to.
     */
    Eyes.prototype.setForcedImageRotation = function (degrees) {
        if (typeof degrees !== 'number') {
            throw new TypeError('degrees must be a number! set to 0 to clear');
        }
        this._imageRotationDegrees = degrees;
        this._automaticRotation = false;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the rotation degrees.
     * @returns {*|number} - The rotation degrees.
     */
    Eyes.prototype.getForcedImageRotation = function () {
        return this._imageRotationDegrees || 0;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Hide the scrollbars when taking screenshots.
     * @param {boolean} hide - Whether to hide the scrollbars or not.
     */
    Eyes.prototype.setHideScrollbars = function (hide) {
        this._hideScrollbars = hide;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Hide the scrollbars when taking screenshots.
     * @return {boolean|null} - true if the hide scrollbars option is on, otherwise false.
     */
    Eyes.prototype.getHideScrollbars = function () {
        return this._hideScrollbars;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Set the stitch mode.
     * @param {StitchMode} mode - The desired stitch mode settings.
     */
    Eyes.prototype.setStitchMode = function (mode) {
        this._stitchMode = mode;
        if (this._driver) {
            switch (mode) {
                case StitchMode.CSS:
                    this.setPositionProvider(new CssTranslatePositionProvider(this._logger, this._driver, this._promiseFactory));
                    break;
                default:
                    this.setPositionProvider(new ScrollPositionProvider(this._logger, this._driver, this._promiseFactory));
            }
        }
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the stitch mode.
     * @return {StitchMode} The currently set StitchMode.
     */
    Eyes.prototype.getStitchMode = function () {
        return this._stitchMode;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Sets the wait time between before each screen capture, including between
     * screen parts of a full page screenshot.
     * @param waitBeforeScreenshots - The wait time in milliseconds.
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
     * Get the wait time before each screenshot.
     * @returns {number|*} the wait time between before each screen capture, in milliseconds.
     */
    Eyes.prototype.getWaitBeforeScreenshots = function () {
        return this._waitBeforeScreenshots;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the session id.
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

    /**
     * @readonly
     * @enum {string}
     */
    Eyes.StitchMode = Object.freeze(StitchMode);
    module.exports = Eyes;
}());
