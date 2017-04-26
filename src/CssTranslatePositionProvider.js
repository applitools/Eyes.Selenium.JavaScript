(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        EyesSeleniumUtils = require('./EyesSeleniumUtils');
    var PositionProvider = EyesSDK.PositionProvider,
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
        return that._promiseFactory.makePromise(function (resolve) {
            that._logger.verbose("getCurrentPosition()");
            that._logger.verbose("position to return: ", that._lastSetPosition);
            resolve(that._lastSetPosition);
        });
    };

    /**
     * Go to the specified location.
     * @param {{x: number, y: number}} location The position to scroll to.
     * @returns {Promise<void>}
     */
    CssTranslatePositionProvider.prototype.setPosition = function (location) {
        var that = this;
        that._logger.verbose("Setting position to:", location);
        return EyesSeleniumUtils.translateTo(this._driver, location, this._promiseFactory).then(function () {
            that._logger.verbose("Done!");
            that._lastSetPosition = location;
        });
    };

    /**
     * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
     */
    CssTranslatePositionProvider.prototype.getEntireSize = function () {
        var that = this;
        return EyesSeleniumUtils.getEntirePageSize(this._driver, this._promiseFactory).then(function (result) {
            that._logger.verbose("Entire size: ", result);
            return result;
        });
    };

    /**
     * @returns {Promise<object.<string, string>>}
     */
    CssTranslatePositionProvider.prototype.getState = function () {
        var that = this;
        return EyesSeleniumUtils.getCurrentTransform(this._driver, this._promiseFactory).then(function (transforms) {
            that._logger.verbose("Current transform", transforms);
            return transforms;
        });
    };

    /**
     * @param {object.<string, string>} state The initial state of position
     * @returns {Promise<void>}
     */
    CssTranslatePositionProvider.prototype.restoreState = function (state) {
        var that = this;
        return EyesSeleniumUtils.setTransforms(this._driver, state, this._promiseFactory).then(function () {
            that._logger.verbose("Transform (position) restored.");
        });
    };

    module.exports = CssTranslatePositionProvider;
}());