(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        ScrollPositionMemento = require('./ScrollPositionMemento'),
        EyesSeleniumUtils = require('./EyesSeleniumUtils');
    var PositionProvider = EyesSDK.PositionProvider,
        Location = EyesSDK.Location,
        ArgumentGuard = EyesUtils.ArgumentGuard;

    /**
     * @param {Object} logger A Logger instance.
     * @param {EyesWebDriver} executor
     */
    function ScrollPositionProvider(logger, executor) {
        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(executor, "executor");

        this._logger = logger;
        this._executor = executor;
    }

    ScrollPositionProvider.prototype = new PositionProvider();
    ScrollPositionProvider.prototype.constructor = ScrollPositionProvider;

    /**
     * @returns {!promise.Promise<Location>} The scroll position of the current frame.
     */
    ScrollPositionProvider.prototype.getCurrentPosition = function () {
        var that = this;
        that._logger.verbose("getCurrentScrollPosition()");
        return EyesSeleniumUtils.getCurrentScrollPosition(this._executor).then(function (result) {
            that._logger.verbose("Current position: " + result);
            return result;
        });
    };

    /**
     * Go to the specified location.
     * @param {Location} location The position to scroll to.
     * @returns {!promise.Promise<void>}
     */
    ScrollPositionProvider.prototype.setPosition = function (location) {
        var that = this;
        that._logger.verbose("Scrolling to %s" + location);
        return EyesSeleniumUtils.setCurrentScrollPosition(this._executor, location).then(function () {
            that._logger.verbose("Done scrolling!");
        });
    };

    /**
     * @returns {!promise.Promise<RectangleSize>} The entire size of the container which the position is relative to.
     */
    ScrollPositionProvider.prototype.getEntireSize = function () {
        var that = this;
        return EyesSeleniumUtils.getCurrentFrameContentEntireSize(this._executor).then(function (result) {
            that._logger.verbose("Entire size: " + result);
            return result;
        });
    };

    /**
     * @returns {!promise.Promise<ScrollPositionMemento>}
     */
    ScrollPositionProvider.prototype.getState = function () {
        return this.getCurrentPosition().then(function (location) {
            return new ScrollPositionMemento(location);
        });
    };

    /**
     * @param {ScrollPositionMemento} state
     */
    ScrollPositionProvider.prototype.restoreState = function (state) {
        this.setPosition(new Location(state.getX(), state.getY()));
    };

    module.exports = ScrollPositionProvider;
}());