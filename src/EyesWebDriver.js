/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

(function () {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        EyesUtils = require('eyes.utils'),
        Frame = require('./Frame'),
        FrameChain = require('./FrameChain'),
        EyesSeleniumUtils = require('./EyesSeleniumUtils'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        ScrollPositionProvider = require('./ScrollPositionProvider'),
        EyesTargetLocator = require('./EyesTargetLocator');
    var GeneralUtils = EyesUtils.GeneralUtils;

    /**
     *
     * C'tor = initializes the module settings
     *
     * @constructor
     * @param {Object} remoteWebDriver
     * @param {Eyes} eyes An instance of Eyes
     * @param {Object} logger
     * @param {PromiseFactory} promiseFactory
     * @augments WebDriver
     **/
    function EyesWebDriver(remoteWebDriver, eyes, logger, promiseFactory) {
        this._eyesDriver = eyes;
        this._logger = logger;
        this._promiseFactory = promiseFactory;
        this._defaultContentViewportSize = null;
        this._frameChain = new FrameChain(this._logger, null);
        /** @type webdriver.By|ProtractorBy */
        this._byFunctions = eyes._isProtractorLoaded ? global.by : webdriver.By;
        this.setRemoteWebDriver(remoteWebDriver);
    }

    //noinspection JSUnusedGlobalSymbols
    EyesWebDriver.prototype.getEyes = function () {
        return this._eyesDriver;
    };

    //noinspection JSUnusedGlobalSymbols
    EyesWebDriver.prototype.setEyes = function (eyes) {
        this._eyesDriver = eyes;
    };

    //noinspection JSUnusedGlobalSymbols
    EyesWebDriver.prototype.getRemoteWebDriver = function () {
        return this._driver;
    };

    //noinspection JSUnusedGlobalSymbols
    EyesWebDriver.prototype.setRemoteWebDriver = function (remoteWebDriver) {
        this._driver = remoteWebDriver;
        GeneralUtils.mixin(this, remoteWebDriver);

        // remove then method, which comes from thenableWebDriver (Selenium 3+)
        delete this.then;
    };

    //noinspection JSUnusedGlobalSymbols
    EyesWebDriver.prototype.getUserAgent = function () {
        return this._driver.executeScript('return navigator.userAgent');
    };

    //noinspection JSCheckFunctionSignatures
    /**
     * @param {webdriver.By|ProtractorBy} locator
     * @return {EyesRemoteWebElement}
     */
    EyesWebDriver.prototype.findElement = function (locator) {
        var that = this;
        return new EyesRemoteWebElement(that._driver.findElement(locator), that, that._logger);
    };

    //noinspection JSCheckFunctionSignatures
    /**
     * @param {webdriver.By|ProtractorBy} locator
     * @return {Promise.<EyesRemoteWebElement[]>}
     */
    EyesWebDriver.prototype.findElements = function (locator) {
        var that = this;
        return this._driver.findElements(locator).then(function (elements) {
            return elements.map(function (element) {
                return new EyesRemoteWebElement(element, that, that._logger);
            });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} cssSelector
     * @return {EyesRemoteWebElement}
     */
    EyesWebDriver.prototype.findElementByCssSelector = function (cssSelector) {
        return this.findElement(this._byFunctions.css(cssSelector));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} cssSelector
     * @return {Promise.<EyesRemoteWebElement[]>}
     */
    EyesWebDriver.prototype.findElementsByCssSelector = function (cssSelector) {
        return this.findElements(this._byFunctions.css(cssSelector));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     * @return {EyesRemoteWebElement}
     */
    EyesWebDriver.prototype.findElementById = function (name) {
        return this.findElement(this._byFunctions.id(name));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     * @return {Promise.<EyesRemoteWebElement[]>}
     */
    EyesWebDriver.prototype.findElementsById = function (name) {
        return this.findElements(this._byFunctions.id(name));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     * @return {EyesRemoteWebElement}
     */
    EyesWebDriver.prototype.findElementByName = function (name) {
        return this.findElement(this._byFunctions.name(name));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     * @return {Promise.<EyesRemoteWebElement[]>}
     */
    EyesWebDriver.prototype.findElementsByName = function (name) {
        return this.findElements(this._byFunctions.name(name));
    };

//  EyesWebDriver.prototype.init = function () {
//    return new Promise(function (resolve) {
//      this._driver.getCapabilities().then(function (capabilities) {
//        if (!capabilities.has(webdriver.Capability.TAKES_SCREENSHOT)) {
//          this._screenshotTaker = new ScreenshotTaker();
//        }
//        resolve();
//      }.bind(this));
//    }.bind(this));
//  };

    /**
     * @returns {EyesTargetLocator}
     */
    EyesWebDriver.prototype.switchTo = function () {
        var that = this;
        this._logger.verbose("switchTo()");

        var OnWillSwitch = function () {
        };

        /**
         * @param {EyesTargetLocator.TargetType} targetType
         * @param {EyesRemoteWebElement|WebElement} targetFrame
         * @returns {Promise<void>}
         */
        OnWillSwitch.willSwitchToFrame = function (targetType, targetFrame) {
            that._logger.verbose("willSwitchToFrame()");
            switch (targetType) {
                case EyesTargetLocator.TargetType.DEFAULT_CONTENT:
                    that._logger.verbose("Default content.");
                    that._frameChain.clear();
                    return that._promiseFactory.makePromise(function (resolve) {
                        resolve();
                    });
                case EyesTargetLocator.TargetType.PARENT_FRAME:
                    that._logger.verbose("Parent frame.");
                    that._frameChain.pop();
                    return that._promiseFactory.makePromise(function (resolve) {
                        resolve();
                    });
                default: // Switching into a frame
                    that._logger.verbose("Frame");

                    var frameId, pl, sp, size;
                    return targetFrame.getId()
                        .then(function (_id) {
                            frameId = _id;
                            return targetFrame.getLocation();
                        })
                        .then(function (_location) {
                            pl = _location;
                            return targetFrame.getSize();
                        })
                        .then(function (_size) {
                            size = _size;
                            return new ScrollPositionProvider(that._logger, that._driver, that._promiseFactory).getCurrentPosition();
                        })
                        .then(function (_scrollPosition) {
                            sp = _scrollPosition;

                            // Get the frame's content location.
                            return EyesSeleniumUtils.getLocationWithBordersAddition(that._logger, targetFrame, pl, that._promiseFactory);
                        }).then(function (contentLocation) {
                            that._frameChain.push(new Frame(that._logger, targetFrame, frameId, contentLocation, size, sp));
                            that._logger.verbose("Done!");
                        });
            }
        };

        //noinspection JSUnusedLocalSymbols
        OnWillSwitch.willSwitchToWindow = function (nameOrHandle) {
            that._logger.verbose("willSwitchToWindow()");
            that._frameChain.clear();
            that._logger.verbose("Done!");
            return that._promiseFactory.makePromise(function (resolve) {
                resolve();
            });
        };

        return new EyesTargetLocator(this._logger, this, this._driver.switchTo(), OnWillSwitch, this._promiseFactory);
    };

    /**
     * @param {boolean} forceQuery If true, we will perform the query even if we have a cached viewport size.
     * @return {Promise<{width: number, height: number}>} The viewport size of the default content (outer most frame).
     */
    EyesWebDriver.prototype.getDefaultContentViewportSize = function (forceQuery) {
        var that = this;
        return this._promiseFactory.makePromise(function (resolve) {
            that._logger.verbose("getDefaultContentViewportSize()");

            if (that._defaultContentViewportSize !== null && !forceQuery) {
                that._logger.verbose("Using cached viewport size: ", that._defaultContentViewportSize);
                resolve(that._defaultContentViewportSize);
                return;
            }

            var currentFrames = that.getFrameChain();
            var promise = that._promiseFactory.makePromise(function (resolve) {
                resolve();
            });

            // Optimization
            if (currentFrames.size() > 0) {
                promise.then(function () {
                    return that.switchTo().defaultContent();
                });
            }

            promise.then(function () {
                that._logger.verbose("Extracting viewport size...");
                return EyesSeleniumUtils.getViewportSizeOrDisplaySize(that._logger, that._driver, that._promiseFactory);
            }).then(function (viewportSize) {
                that._defaultContentViewportSize = viewportSize;
                that._logger.verbose("Done! Viewport size: ", that._defaultContentViewportSize);
            });

            if (currentFrames.size() > 0) {
                promise.then(function () {
                    return that.switchTo().frames(currentFrames);
                });
            }

            promise.then(function () {
                resolve(that._defaultContentViewportSize);
            });
        });
    };

    /**
     *
     * @return {FrameChain} A copy of the current frame chain.
     */
    EyesWebDriver.prototype.getFrameChain = function () {
        return new FrameChain(this._logger, this._frameChain);
    };

    module.exports = EyesWebDriver;
}());
