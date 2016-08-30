(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils');
    var PositionProvider = EyesUtils.PositionProvider,
        BrowserUtils = EyesUtils.BrowserUtils,
        ArgumentGuard = EyesUtils.ArgumentGuard;

    /**
     * @constructor
     * @param {Logger} logger A Logger instance.
     * @param {EyesWebDriver} executor
     * @param {PromiseFactory} promiseFactory
     * @augments PositionProvider
     */
    function CssTranslatePositionProvider(logger, executor, promiseFactory) {
        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(executor, "executor");

        this._logger = logger;
        this._driver = executor;
        this._promiseFactory = promiseFactory;
        this._lastSetPosition = null;
    }

    CssTranslatePositionProvider.prototype = new PositionProvider();
    CssTranslatePositionProvider.prototype.constructor = CssTranslatePositionProvider;

    /**
     * @returns {Promise<{x: number, y: number}>} The scroll position of the current frame.
     */
    CssTranslatePositionProvider.prototype.getCurrentPosition = function () {
        var that = this;
        that._logger.verbose("getCurrentScrollPosition()");
        that._logger.verbose("position to return: " + that._lastSetPosition);
        return that._lastSetPosition;
    };

    /**
     * Go to the specified location.
     * @param {{x: number, y: number}} location The position to scroll to.
     * @returns {Promise<void>}
     */
    CssTranslatePositionProvider.prototype.setPosition = function (location) {
        var that = this;
        that._logger.verbose("Setting position to [" + location.y + "," + location.y + "]");
        return BrowserUtils.translateTo(this._driver, location, this._promiseFactory).then(function () {
            that._logger.verbose("Done!");
            that._lastSetPosition = location;
        });
    };

    /**
     * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
     */
    CssTranslatePositionProvider.prototype.getEntireSize = function () {
        var that = this;
        return BrowserUtils.getEntirePageSize(this._driver, this._promiseFactory).then(function (result) {
            that._logger.verbose("Entire size: [" + result.width + "," + result.height + "]");
            return result;
        });
    };

    module.exports = CssTranslatePositionProvider;
}());