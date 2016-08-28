(function () {
    'use strict';

    var EyesUtils = require('eyes.utils'),
        FrameChain = require('./FrameChain'),
        ScrollPositionProvider = require('./ScrollPositionProvider'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement');
    var ArgumentGuard = EyesUtils.ArgumentGuard,
        GeneralUtils = EyesUtils.GeneralUtils;

    /**
     * @enum {number}
     * @readonly
     */
    EyesTargetLocator.TargetType = {
        FRAME: 1,
        PARENT_FRAME: 2,
        DEFAULT_CONTENT: 3
    };

    /**
     * A wrapper for an action to be performed before the actual switch is made.
     */
    function OnWillSwitch() {
        /**
         * Will be called before switching into a frame.
         * @param {TargetType} targetType The type of frame we're about to switch into.
         * @param {WebElement} targetFrame The element about to be switched to,
         * if available. Otherwise, null.
         */
        this.prototype.willSwitchToFrame = function (targetType, targetFrame) {
        };

        /**
         * Will be called before switching into a window.
         * @param {string} nameOrHandle The name/handle of the window to be switched to.
         */
        this.prototype.willSwitchToWindow = function (nameOrHandle) {
        };
    }

    /**
     * @constructor
     * Initialized a new EyesTargetLocator object.
     * @param {Object} logger A Logger instance.
     * @param {EyesWebDriver} driver The WebDriver from which the targetLocator was received.
     * @param {TargetLocator} targetLocator The actual TargetLocator object.
     * @param {OnWillSwitch} onWillSwitch A delegate to be called whenever a relavant switch
     * is about to be performed.
     */
    function EyesTargetLocator(logger, driver, targetLocator, onWillSwitch) {
        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(driver, "driver");
        ArgumentGuard.notNull(targetLocator, "targetLocator");
        ArgumentGuard.notNull(onWillSwitch, "onWillSwitch");

        this._logger = logger;
        this._driver = driver;
        this._targetLocator = targetLocator;
        this._onWillSwitch = onWillSwitch;
        this._scrollPosition = new ScrollPositionProvider(this._logger, this._driver);
        GeneralUtils.mixin(this, targetLocator);
    }

    /**
     * @param {int|string|EyesRemoteWebElement} obj
     * @returns {!promise.Promise<void>}
     */
    EyesTargetLocator.prototype.frame = function (obj) {
        var that = this, frames;
        if (typeof obj === 'string' || obj instanceof String) {
            this._logger.verbose("EyesTargetLocator.frame('" + obj + "')");
            // Finding the target element so we can report it.
            // We use find elements(plural) to avoid exception when the element
            // is not found.
            this._logger.verbose("Getting frames by name...");
            return this._driver.findElementsByName(obj).then(function(elements) {
                if (elements.length == 0) {
                    that._logger.verbose("No frames Found! Trying by id...");
                    // If there are no frames by that name, we'll try the id
                    return that._driver.findElementsById(obj);
                }

                return elements;
            }).then(function(elements) {
                if (elements.length == 0) {
                    // No such frame, bummer
                    throw new Error("No frame with name or id '" + obj + "' exists!");
                }

                return elements;
            }).then(function (frames) {
                if (frames.length == 0) {
                    that._logger.verbose("No frames Found! Trying by id...");
                    // If there are no frames by that name, we'll try the id
                    frames = that._driver.findElementsById(obj);
                    if (frames.length == 0) {
                        // No such frame, bummer
                        throw new Error("No frame with name or id '" + obj + "' exists!");
                    }
                }
                that._logger.verbose("Done! Making preparations..");
                return that._onWillSwitch.willSwitchToFrame(EyesTargetLocator.TargetType.FRAME, frames.get(0));
            }).then(function () {
                that._logger.verbose("Done! Switching to frame...");
                return that._targetLocator.frame(obj)
            }).then(function () {
                that._logger.verbose("Done!");
            });
        } else if (obj instanceof EyesRemoteWebElement) {
            that._logger.verbose("EyesTargetLocator.frame(element)");
            that._logger.verbose("Making preparations..");
            return that._onWillSwitch.willSwitchToFrame(EyesTargetLocator.TargetType.FRAME, obj).then(function () {
                that._logger.verbose("Done! Switching to frame...");
                return that._targetLocator.frame(obj)
            }).then(function () {
                that._logger.verbose("Done!");
            });
        } else {
            that._logger.verbose("EyesTargetLocator.frame(" + obj + ")");
            // Finding the target element so and reporting it using onWillSwitch.
            that._logger.verbose("Getting frames list...");
            return that._driver.findElementsByCssSelector("frame, iframe").then(function (elements) {
                if (obj > elements.length) {
                    throw new Error("Frame index [" + obj + "] is invalid!");
                }

                return elements;
            }).then(function (frames) {
                that._logger.verbose("Done! getting the specific frame...");
                var targetFrame = frames[obj];
                that._logger.verbose("Done! Making preparations...");
                return that._onWillSwitch.willSwitchToFrame(EyesTargetLocator.TargetType.FRAME, targetFrame);

            }).then(function () {
                that._logger.verbose("Done! Switching to frame...");
                return that._targetLocator.frame(obj)
            }).then(function () {
                that._logger.verbose("Done!");
            });
        }
    };

    // /**
    //  * @returns {EyesWebDriver}
    //  */
    // EyesTargetLocator.prototype.parentFrame = function () {
    //   this._logger.verbose("EyesTargetLocator.parentFrame()");
    //   if (this._driver.getFrameChain().size() != 0) {
    //     this._logger.verbose("Making preparations..");
    //     this._onWillSwitch.willSwitchToFrame(TargetType.PARENT_FRAME, null);
    //     this._logger.verbose("Done! Switching to parent frame..");
    //     this._targetLocator.parentFrame();
    //   }
    //   this._logger.verbose("Done!");
    //   return this._driver;
    // };

    /**
     * Switches into every frame in the frame chain. This is used as way to
     * switch into nested frames (while considering scroll) in a single call.
     * @param {FrameChain|string[]} obj The path to the frame to switch to.
     * Or the path to the frame to check. This is a list of frame names/IDs
     * (where each frame is nested in the previous frame).
     * @return {!promise.Promise<void>} The WebDriver with the switched context.
     */
    EyesTargetLocator.prototype.frames = function (obj) {
        var that = this;
        return this._driver._promiseFactory.makePromise(function (resolve) {
            if (obj instanceof FrameChain) {
                that._logger.verbose("EyesTargetLocator.frames(frameChain)");
                _framesSetPosition(that, obj, obj.size() - 1, that._driver._promiseFactory).then(function () {
                    that._logger.verbose("Done switching into nested frames!");
                    resolve();
                });
            } else if (Array.isArray(obj)) {
                _framesSetPositionFromArray(that, obj, obj.length - 1, that._driver._promiseFactory).then(function () {
                    that._logger.verbose("Done switching into nested frames!");
                    resolve();
                });
            }
        });
    };

    function _framesSetPosition(targetLocator, obj, retries, promiseFactory) {
        return promiseFactory.makePromise(function (resolve, reject) {

            // TODO: check order, if it make sense
            var frame = obj.getFrames()[retries];
            targetLocator._scrollPosition.setPosition(frame.getParentScrollPosition()).then(function () {
                targetLocator._logger.verbose("Done! Switching to frame...");
                return targetLocator._driver.switchTo().frame(frame.getReference());
            }).then(function () {
                targetLocator._logger.verbose("Done!");

                if (retries === 0) {
                    resolve();
                    return;
                }

                targetLocator.controlFlow().then(function () {
                    _framesSetPosition(targetLocator, obj, retries - 1, promiseFactory).then(function () {
                        resolve();
                    });
                });
            });
        });
    }

    function _framesSetPositionFromArray(targetLocator, obj, retries, promiseFactory) {
        return promiseFactory.makePromise(function (resolve, reject) {

            targetLocator._logger.verbose("Switching to frame...");
            targetLocator._driver.switchTo().frame(obj[retries]).then(function () {
                targetLocator._logger.verbose("Done!");

                if (retries === 0) {
                    resolve();
                    return;
                }

                targetLocator.controlFlow().then(function () {
                    _framesSetPositionFromArray(targetLocator, obj, retries - 1, promiseFactory).then(function () {
                        resolve();
                    });
                });
            });
        });
    }

    /**
     * @param {string} nameOrHandle
     * @returns {EyesWebDriver}
     */
    EyesTargetLocator.prototype.window = function (nameOrHandle) {
        this._logger.verbose("EyesTargetLocator.window()");
        this._logger.verbose("Making preparations..");
        this._onWillSwitch.willSwitchToWindow(nameOrHandle);
        this._logger.verbose("Done! Switching to window..");
        this._targetLocator.window(nameOrHandle);
        this._logger.verbose("Done!");
        return this._driver;
    };

    /**
     * @returns {!promise.Promise<void>}
     */
    EyesTargetLocator.prototype.defaultContent = function () {
        var that = this;
        return this._driver._promiseFactory.makePromise(function (resolve) {
            that._logger.verbose("EyesTargetLocator.defaultContent()");
            if (that._driver.getFrameChain().size() != 0) {
                that._logger.verbose("Making preparations..");
                that._onWillSwitch.willSwitchToFrame(EyesTargetLocator.TargetType.DEFAULT_CONTENT, null).then(function () {
                    that._logger.verbose("Done! Switching to default content..");
                    return that._targetLocator.defaultContent();
                }).then(function () {
                    that._logger.verbose("Done!");
                    resolve();
                });
            }

            resolve();
        });
    };

    // /**
    //  * @returns {WebElement|*}
    //  */
    // EyesTargetLocator.prototype.activeElement = function () {
    //   this._logger.verbose("EyesTargetLocator.activeElement()");
    //   this._logger.verbose("Switching to element..");
    //   var element = this._targetLocator.activeElement();
    //   if (!(element instanceof RemoteWebElement)) {
    //     throw new Error("activeElement is not a remote web element!");
    //   }
    //   var result = new EyesRemoteWebElement(logger, driver, (RemoteWebElement)element);
    //   this._logger.verbose("Done!");
    //   return result;
    // };

    /**
     * @returns {Alert}
     */
    EyesTargetLocator.prototype.alert = function () {
        this._logger.verbose("EyesTargetLocator.alert()");
        this._logger.verbose("Switching to alert..");
        var result = this._targetLocator.alert();
        this._logger.verbose("Done!");
        return result;
    };

    module.exports = EyesTargetLocator;
}());