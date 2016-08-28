(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils');
    var PositionProvider = EyesSDK.PositionProvider,
        BrowserUtils = EyesUtils.BrowserUtils,
        ArgumentGuard = EyesUtils.ArgumentGuard;

    /**
     * @param {Object} logger A Logger instance.
     * @param {EyesWebDriver} executor
     * @param {PromiseFactory} promiseFactory
     */
    function ScrollPositionProvider(logger, executor, promiseFactory) {
        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(executor, "executor");

        this._logger = logger;
        this._executor = executor;
        this._promiseFactory = promiseFactory;
    }

    ScrollPositionProvider.prototype = new PositionProvider();
    ScrollPositionProvider.prototype.constructor = ScrollPositionProvider;

    /**
     * @returns {Promise<{x: number, y: number}>} The scroll position of the current frame.
     */
    ScrollPositionProvider.prototype.getCurrentPosition = function () {
        var that = this;
        that._logger.verbose("getCurrentScrollPosition()");
        return BrowserUtils.getCurrentScrollPosition(this._executor, this._promiseFactory).then(function (result) {
            that._logger.verbose("Current position: [" + result.x + "," + result.y + "]");
            return result;
        });
    };

    /**
     * Go to the specified location.
     * @param {{x: number, y: number}} location The position to scroll to.
     * @returns {Promise<void>}
     */
    ScrollPositionProvider.prototype.setPosition = function (location) {
        var that = this;
        that._logger.verbose("Scrolling to [" + location.y + "," + location.y + "]");
        return BrowserUtils.scrollTo(this._executor, location, this._promiseFactory).then(function () {
            that._logger.verbose("Done scrolling!");
        });
    };

    /**
     * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
     */
    ScrollPositionProvider.prototype.getEntireSize = function () {
        var that = this;
        return BrowserUtils.getEntirePageSize(this._executor, this._promiseFactory).then(function (result) {
            that._logger.verbose("Entire size: [" + result.width + "," + result.height + "]");
            return result;
        });
    };

    module.exports = ScrollPositionProvider;
}());