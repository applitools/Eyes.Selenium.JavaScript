(function() {
    'use strict';

    var EyesUtils = require('eyes.utils');
    var PositionProvider = EyesUtils.PositionProvider,
        ArgumentGuard = EyesUtils.ArgumentGuard;

    /**
     * @constructor
     * @param {Logger} logger A Logger instance.
     * @param {EyesWebDriver} eyesDriver
     * @param {EyesRemoteWebElement} element
     * @param {PromiseFactory} promiseFactory
     * @augments PositionProvider
     */
    function ElementPositionProvider(logger, eyesDriver, element, promiseFactory) {
        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(eyesDriver, "executor");
        ArgumentGuard.notNull(element, "element");

        this._logger = logger;
        this._eyesDriver = eyesDriver;
        this._promiseFactory = promiseFactory;
        this._element = element;
    }

    ElementPositionProvider.prototype = new PositionProvider();
    ElementPositionProvider.prototype.constructor = ElementPositionProvider;

    /**
     * @returns {Promise<{x: number, y: number}>} The scroll position of the current frame.
     */
    ElementPositionProvider.prototype.getCurrentPosition = function () {
        var that = this, elScrollLeft, elScrollTop;
        that._logger.verbose("getCurrentScrollPosition()");

        return that._element.getScrollLeft().then(function (value) {
            elScrollLeft = value;
            return that._element.getScrollTop();
        }).then(function (value) {
            elScrollTop = value;
            that._logger.verbose("Current position: [" + elScrollLeft + "," + elScrollTop + "]");

            return {
                x: elScrollLeft,
                y: elScrollTop
            };
        });
    };

    /**
     * Go to the specified location.
     * @param {{x: number, y: number}} location The position to scroll to.
     * @returns {Promise<void>}
     */
    ElementPositionProvider.prototype.setPosition = function (location) {
        var that = this;
        that._logger.verbose("Scrolling to:", location);
        return that._element.scrollTo(location).then(function () {
            that._logger.verbose("Done scrolling!");
        });
    };

    /**
     * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
     */
    ElementPositionProvider.prototype.getEntireSize = function () {
        var that = this, elScrollWidth, elScrollHeight;
        that._logger.verbose("getEntireSize()");
        return that._element.getScrollWidth().then(function (value) {
            elScrollWidth = value;
            return that._element.getScrollHeight();
        }).then(function (value) {
            elScrollHeight = value;

            that._logger.verbose("Entire size: [" + elScrollWidth + "," + elScrollHeight + "]");

            return {
                width: elScrollWidth,
                height: elScrollHeight
            };
        });
    };

    module.exports = ElementPositionProvider;
}());