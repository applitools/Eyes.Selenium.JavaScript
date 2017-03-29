(function () {
    'use strict';

    var EyesUtils = require('eyes.utils');
    var GeometryUtils = EyesUtils.GeometryUtils;

    /**
     * @constructor
     **/
    function Target(region, frame) {
        this._region = region;
        this._frame = frame;

        this._timeout = null;
        this._stitchContent = false;
        this._ignoreMismatch = false;
        this._ignoreRegions = [];
        this._floatingRegions = [];
    }

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {int} ms Milliseconds to wait
     * @return {Target}
     */
    Target.prototype.timeout = function (ms) {
        this._timeout = ms;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {boolean} stitchContent
     * @return {Target}
     */
    Target.prototype.stitchContent = function (stitchContent) {
        this._stitchContent = stitchContent;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {boolean} ignoreMismatch
     * @return {Target}
     */
    Target.prototype.ignoreMismatch = function (ignoreMismatch) {
        this._ignoreMismatch = ignoreMismatch;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {...{left: number, top: number, width: number, height: number}} ignoreRegion
     * @return {Target}
     */
    Target.prototype.ignore = function (ignoreRegion) {
        for (var i = 0, l = arguments.length; i < l; i++) {
            if (arguments[i] !== null && GeometryUtils.isRegion(arguments[i])) {
                this._ignoreRegions.push(arguments[i]);
            } else {
                throw new Error("Unsupported type of ignore object.");
            }
        }
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {...{left: number, top: number, width: number, height: number,
     *          maxLeftOffset: number, maxRightOffset: number, maxUpOffset: number, maxDownOffset: number}} floatingRegion
     * @return {Target}
     */
    Target.prototype.floating = function (floatingRegion) {
        for (var i = 0, l = arguments.length; i < l; i++) {
            if (arguments[i] !== null && GeometryUtils.isRegion(arguments[i]) &&
                "maxLeftOffset" in arguments[i] && "maxRightOffset" in arguments[i] && "maxUpOffset" in arguments[i] && "maxDownOffset" in arguments[i]) {
                this._floatingRegions.push(arguments[i]);
            } else {
                throw new Error("Unsupported type of floating object.");
            }

        }
        return this;
    };

    Target.prototype.getRegion = function () {
        return this._region;
    };

    Target.prototype.isUsingRegion = function () {
        return !!this._region;
    };

    Target.prototype.getFrame = function () {
        return this._frame;
    };

    Target.prototype.isUsingFrame = function () {
        return !!this._frame;
    };

    Target.prototype.getTimeout = function () {
        return this._timeout;
    };

    Target.prototype.getStitchContent = function () {
        return this._stitchContent;
    };

    Target.prototype.getIgnoreMismatch = function () {
        return this._ignoreMismatch;
    };

    Target.prototype.getIgnoreRegions = function () {
        return this._ignoreRegions;
    };

    Target.prototype.getFloatingRegions = function () {
        return this._floatingRegions;
    };

    /**
     * Validate current window
     *
     * @return {Target}
     * @constructor
     */
    Target.Window = function () {
        return new Target();
    };

    /**
     * Validate region (in current window or frame) using region's rect, element or element's locator
     *
     * @param {{left: number, top: number, width: number, height: number}|webdriver.WebElement|EyesRemoteWebElement|webdriver.By} region The region to validate.
     * @param {webdriver.WebElement|EyesRemoteWebElement|String} [frame] The element which is the frame to switch to.
     * @return {Target}
     * @constructor
     */
    Target.Region = function (region, frame) {
        return new Target(region, frame);
    };

    /**
     * Validate frame
     *
     * @param {EyesRemoteWebElement|webdriver.WebElement|String} frame The element which is the frame to switch to.
     * @return {Target}
     * @constructor
     */
    Target.Frame = function (frame) {
        return new Target(null, frame);
    };

    module.exports = Target;
}());
