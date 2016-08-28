/*
 ---

 name: BordersAwareElementContentLocationProvider

 description: Encapsulates an algorithm to find an element's content location, based on the element's location.

 ---
 */
(function () {
    "use strict";

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement');
    var Location = EyesSDK.Location,
        ArgumentGuard = EyesUtils.ArgumentGuard;

    /**
     *
     * @param {Object} logger The logger to use.
     * @param {PromiseFactory} promiseFactory
     * @constructor
     */
    function BordersAwareElementContentLocationProvider(logger, promiseFactory) {
        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(promiseFactory, "promiseFactory");

        this._logger = logger;
        this._promiseFactory = promiseFactory;
    }

    /**
     * Returns a location based on the given location.
     * @param {EyesRemoteWebElement} element The element for which we want to find the content's location.
     * @param {Location} location The location of the element.
     * @return {!promise.Promise<Location>} The location of the content of the element.
     */
    BordersAwareElementContentLocationProvider.prototype.getLocation = function (element, location) {
        ArgumentGuard.notNull(element, "element");
        ArgumentGuard.notNull(location, "location");

        this._logger.verbose("BordersAdditionFrameLocationProvider(logger, element, " + location.toString() + ")");
        var that = this, leftBorderWidth, topBorderWidth;
        return _getLeftBorderWidth(this._logger, this._promiseFactory, element).then(function (val) {
            leftBorderWidth = val;
            return _getTopBorderWidth(that._logger, that._promiseFactory, element);
        }).then(function (val) {
            topBorderWidth = val;

            // Frame borders also have effect on the frame's location.
            var contentLocation = Location.fromLocation(location);
            contentLocation.offset([leftBorderWidth, topBorderWidth]);
            that._logger.verbose("Done!");
            return contentLocation;
        });
    };

    function _getLeftBorderWidth(logger, promiseFactory, element) {
        return promiseFactory.makePromise(function (resolve) {
            logger.verbose("Get element border left width...");

            try {
                var promise;
                if (element instanceof EyesRemoteWebElement) {
                    logger.verbose("Element is an EyesWebElement, using 'getComputedStyle'.");

                    promise = element.getComputedStyle("border-left-width").then(function (styleValue) {
                        return styleValue;
                    }, function (error) {
                        logger.verbose("Using getComputedStyle failed: " + error + ".");
                        logger.verbose("Using getCssValue...");
                        return element.getCssValue("border-left-width");
                    });
                } else {
                    // OK, this is weird, we got an element which is not
                    // EyesWebElement?? Log it and try to move on.
                    logger.verbose("Element is not an EyesWebElement! (when trying to get border-left-width) Element's class: " + element.getAttribute("class"));
                    logger.verbose("Using getCssValue...");
                    promise = element.getCssValue("border-left-width");
                }

                return promise.then(function (propValue) {
                    logger.verbose("Done!");
                    var leftBorderWidth = Math.round(parseFloat(propValue.trim().replace("px", "")));
                    logger.verbose("border-left-width: " + leftBorderWidth);
                    resolve(leftBorderWidth);
                });
            } catch (err) {
                logger.verbose("Couldn't get the element's border-left-width: " + err + ". Falling back to default");
                resolve(0);
            }
        });
    }

    function _getTopBorderWidth(logger, promiseFactory, element) {
        return promiseFactory.makePromise(function (resolve) {
            logger.verbose("Get element's border top width...");

            try {
                var promise;
                if (element instanceof EyesRemoteWebElement) {
                    logger.verbose("Element is an EyesWebElement, using 'getComputedStyle'.");

                    promise = element.getComputedStyle("border-top-width").then(function (styleValue) {
                        return styleValue;
                    }, function (err) {
                        logger.verbose("Using getComputedStyle failed: " + err + ".");
                        logger.verbose("Using getCssValue...");
                        return element.getCssValue("border-top-width");
                    });
                } else {
                    // OK, this is weird, we got an element which is not
                    // EyesWebElement?? Log it and try to move on.
                    logger.verbose("Element is not an EyesWebElement! (when trying to get border-left-width) Element's class: " + element.getAttribute("class"));
                    logger.verbose("Using getCssValue...");
                    promise = element.getCssValue("border-top-width");
                }

                return promise.then(function (propValue) {
                    logger.verbose("Done!");
                    var topBorderWidth = Math.round(parseFloat(propValue.trim().replace("px", "")));
                    logger.verbose("border-top-width: " + topBorderWidth);
                    resolve(topBorderWidth);
                });
            } catch (err) {
                logger.verbose("Couldn't get the element's border-top-width: " + err + ". Falling back to default");
                resolve(0);
            }
        });
    }

    module.exports = BordersAwareElementContentLocationProvider;
}());