(function () {
    'use strict';

    var EyesUtils = require('eyes.utils');
    var GeometryUtils = EyesUtils.GeometryUtils;

    /**
     * @typedef {{left: number, top: number, width: number, height: number}} Region
     * @typedef {{left: number, top: number, width: number, height: number,
     *            maxLeftOffset: number, maxRightOffset: number, maxUpOffset: number, maxDownOffset: number}} FloatingRegion
     * @typedef {{element: webdriver.WebElement|EyesRemoteWebElement|webdriver.By,
     *            maxLeftOffset: number, maxRightOffset: number, maxUpOffset: number, maxDownOffset: number}} FloatingElement
     */

    /**
     * @constructor
     **/
    function Target(region, frame) {
        this._region = region;
        this._frame = frame;

        this._timeout = null;
        this._stitchContent = false;
        this._ignoreMismatch = false;
        this._matchLevel = null;
        this._ignoreCaret = null;
        this._ignoreRegions = [];
        this._floatingRegions = [];

        this._ignoreObjects = [];
        this._floatingObjects = [];
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
     * @param {boolean} [stitchContent=true]
     * @return {Target}
     */
    Target.prototype.fully = function (stitchContent) {
        if (stitchContent !== false) {
            stitchContent = true;
        }

        this._stitchContent = stitchContent;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {boolean} [ignoreMismatch=true]
     * @return {Target}
     */
    Target.prototype.ignoreMismatch = function (ignoreMismatch) {
        if (ignoreMismatch !== false) {
            ignoreMismatch = true;
        }

        this._ignoreMismatch = ignoreMismatch;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {MatchLevel} matchLevel
     * @return {Target}
     */
    Target.prototype.matchLevel = function (matchLevel) {
        this._matchLevel = matchLevel;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {boolean} [ignoreCaret=true]
     * @return {Target}
     */
    Target.prototype.ignoreCaret = function (ignoreCaret) {
        if (ignoreCaret !== false) {
            ignoreCaret = true;
        }

        this._ignoreCaret = ignoreCaret;
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {...(Region|webdriver.WebElement|EyesRemoteWebElement|webdriver.By|
     *          {element: (webdriver.WebElement|EyesRemoteWebElement|webdriver.By)})} ignoreRegion
     * @return {Target}
     */
    Target.prototype.ignore = function (ignoreRegion) {
        for (var i = 0, l = arguments.length; i < l; i++) {
            if (!arguments[i]) {
                throw new Error("Ignore region can't be null or empty.");
            }

            if (GeometryUtils.isRegion(arguments[i])) {
                this._ignoreRegions.push(arguments[i]);
            } else if (arguments[i].constructor.name === "Object" && "element" in arguments[i]) {
                this._ignoreObjects.push(arguments[i]);
            } else {
                this._ignoreObjects.push({element: arguments[i]});
            }
        }
        return this;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {...(FloatingRegion|FloatingElement)} floatingRegion
     * @return {Target}
     */
    Target.prototype.floating = function (floatingRegion) {
        for (var i = 0, l = arguments.length; i < l; i++) {
            if (!arguments[i]) {
                throw new Error("Floating region can't be null or empty.");
            }

            if (GeometryUtils.isRegion(arguments[i]) &&
                "maxLeftOffset" in arguments[i] && "maxRightOffset" in arguments[i] && "maxUpOffset" in arguments[i] && "maxDownOffset" in arguments[i]) {
                this._floatingRegions.push(arguments[i]);
            } else {
                this._floatingObjects.push(arguments[i]);
            }
        }
        return this;
    };

    /**
     * @returns {Region|webdriver.WebElement|EyesRemoteWebElement|webdriver.By|null}
     */
    Target.prototype.getRegion = function () {
        return this._region;
    };

    /**
     * @returns {boolean}
     */
    Target.prototype.isUsingRegion = function () {
        return !!this._region;
    };

    /**
     * @returns {webdriver.WebElement|EyesRemoteWebElement|String|null}
     */
    Target.prototype.getFrame = function () {
        return this._frame;
    };

    /**
     * @returns {boolean}
     */
    Target.prototype.isUsingFrame = function () {
        return !!this._frame;
    };

    /**
     * @returns {int|null}
     */
    Target.prototype.getTimeout = function () {
        return this._timeout;
    };

    /**
     * @returns {boolean}
     */
    Target.prototype.getStitchContent = function () {
        return this._stitchContent;
    };

    /**
     * @returns {boolean}
     */
    Target.prototype.getIgnoreMismatch = function () {
        return this._ignoreMismatch;
    };

    /**
     * @returns {boolean}
     */
    Target.prototype.getMatchLevel = function () {
        return this._matchLevel;
    };

    /**
     * @returns {boolean|null}
     */
    Target.prototype.getIgnoreCaret = function () {
        return this._ignoreCaret;
    };

    /**
     * @returns {Region[]}
     */
    Target.prototype.getIgnoreRegions = function () {
        return this._ignoreRegions;
    };

    /**
     * @returns {{element: (webdriver.WebElement|EyesRemoteWebElement|webdriver.By)}[]}
     */
    Target.prototype.getIgnoreObjects = function () {
        return this._ignoreObjects;
    };

    /**
     * @returns {FloatingRegion[]}
     */
    Target.prototype.getFloatingRegions = function () {
        return this._floatingRegions;
    };

    /**
     * @returns {FloatingElement[]}
     */
    Target.prototype.getFloatingObjects = function () {
        return this._floatingObjects;
    };

    /**
     * Validate current window
     *
     * @return {Target}
     * @constructor
     */
    Target.window = function () {
        return new Target();
    };

    /**
     * Validate region (in current window or frame) using region's rect, element or element's locator
     *
     * @param {Region|webdriver.WebElement|EyesRemoteWebElement|webdriver.By} region The region to validate.
     * @param {webdriver.WebElement|EyesRemoteWebElement|String} [frame] The element which is the frame to switch to.
     * @return {Target}
     * @constructor
     */
    Target.region = function (region, frame) {
        return new Target(region, frame);
    };

    /**
     * Validate frame
     *
     * @param {EyesRemoteWebElement|webdriver.WebElement|String} frame The element which is the frame to switch to.
     * @return {Target}
     * @constructor
     */
    Target.frame = function (frame) {
        return new Target(null, frame);
    };

    module.exports = Target;
}());
