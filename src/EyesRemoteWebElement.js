/*
 ---

 name: EyesRemoteWebElement

 description: Wraps a Remote Web Element.

 ---
 */

(function () {
    "use strict";

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils');
    var MouseAction = EyesSDK.Triggers.MouseAction,
        GeneralUtils = EyesUtils.GeneralUtils;

    var JS_GET_SCROLL_LEFT = "return arguments[0].scrollLeft;";

    var JS_GET_SCROLL_TOP = "return arguments[0].scrollTop;";

    var JS_GET_SCROLL_WIDTH = "return arguments[0].scrollWidth;";

    var JS_GET_SCROLL_HEIGHT = "return arguments[0].scrollHeight;";

    var JS_GET_OVERFLOW = "return arguments[0].style.overflow;";

    /**
     * @param {string} styleProp
     * @return {string}
     */
    var JS_GET_COMPUTED_STYLE_FORMATTED_STR = function (styleProp) {
        return "var elem = arguments[0], styleProp = '"+ styleProp +"'; " +
        "if (window.getComputedStyle) { " +
        "   return window.getComputedStyle(elem, null).getPropertyValue(styleProp);" +
        "} else if (elem.currentStyle) { " +
        "   return elem.currentStyle[styleProp];" +
        "} else { " +
        "   return null;" +
        "}";
    };

    /**
     * @param {int} scrollLeft
     * @param {int} scrollTop
     * @return {string}
     */
    var JS_SCROLL_TO_FORMATTED_STR = function (scrollLeft, scrollTop) {
        return "arguments[0].scrollLeft = " + scrollLeft + "; " +
            "arguments[0].scrollTop = " + scrollTop + ";";
    };

    /**
     * @param {string} overflow
     * @return {string}
     */
    var JS_SET_OVERFLOW_FORMATTED_STR = function (overflow) {
        return "arguments[0].style.overflow = '" + overflow + "'";
    };

    /**
     *
     * C'tor = initializes the module settings
     *
     * @constructor
     * @param {Object} remoteWebElement
     * @param {EyesWebDriver} eyesDriver
     * @param {Object} logger
     * @augments WebElement
     **/
    function EyesRemoteWebElement(remoteWebElement, eyesDriver, logger) {
        this._element = remoteWebElement;
        this._logger = logger;
        this._eyesDriver = eyesDriver;
        GeneralUtils.mixin(this, remoteWebElement);
    }

    function _getRectangle(location, size) {
        size = size || {height: 0, width: 0};
        location = location || {x: 0, y: 0};

        var left = location.x,
            top = location.y,
            width = size.width,
            height = size.height;

        if (left < 0) {
            width = Math.max(0, width + left);
            left = 0;
        }

        if (top < 0) {
            height = Math.max(0, height + top);
            top = 0;
        }

        return {
            top: top,
            left: left,
            width: width,
            height: height
        };
    }

    function _getBounds (element) {
        return element.getLocation().then(function (location) {
            return element.getSize().then(function (size) {
                return _getRectangle(location, size);
            }, function () {
                return _getRectangle(location);
            });
        }, function () {
            return _getRectangle();
        });
    }

    EyesRemoteWebElement.registerSendKeys = function (element, eyesDriver, logger, args) {
        var text = args.join('');
        logger.verbose("registerSendKeys: text is", text);
        return _getBounds(element).then(function (rect) {
            eyesDriver.getEyes().addKeyboardTrigger(rect, text);
        });
    };

    EyesRemoteWebElement.prototype.sendKeys = function () {
        var that = this, args = Array.prototype.slice.call(arguments, 0);
        return EyesRemoteWebElement.registerSendKeys(that._element, that._eyesDriver, that._logger, args).then(function () {
            return that._element.sendKeys.call(that._element, args);
        });
    };

    EyesRemoteWebElement.registerClick = function (element, eyesDriver, logger) {
        logger.verbose("apply click on element");
        return _getBounds(element).then(function (rect) {
            var offset = {x: rect.width / 2, y: rect.height / 2};
            eyesDriver.getEyes().addMouseTrigger(MouseAction.Click, rect, offset);
        });
    };

    EyesRemoteWebElement.prototype.click = function () {
        var that = this;
        that._logger.verbose("click on element");
        return EyesRemoteWebElement.registerClick(that._element, that._eyesDriver, that._logger).then(function () {
            return that._element.click();
        });
    };

    EyesRemoteWebElement.prototype.findElement = function (locator) {
        var that = this;
        return this._element.findElement(locator).then(function (element) {
            return new EyesRemoteWebElement(element, that._eyesDriver, that._logger);
        });
    };

    EyesRemoteWebElement.prototype.findElements = function (locator) {
        var that = this;
        return this._element.findElements(locator).then(function (elements) {
            return elements.map(function (element) {
                return new EyesRemoteWebElement(element, that._eyesDriver, that._logger);
            });
        });
    };

    /**
     * Returns the computed value of the style property for the current element.
     * @param {string} propStyle The style property which value we would like to extract.
     * @return {promise.Promise.<string>} The value of the style property of the element, or {@code null}.
     */
    EyesRemoteWebElement.prototype.getComputedStyle = function (propStyle) {
        return this._eyesDriver.executeScript(JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle), this);
    };

    /**
     * @return {promise.Promise.<int>} The integer value of a computed style.
     */
    EyesRemoteWebElement.prototype.getComputedStyleInteger = function (propStyle) {
        return this.getComputedStyle(propStyle).then(function (value) {
            return Math.round(parseFloat(value.trim().replace("px", "")));
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollLeft property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollLeft  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_LEFT, this).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollTop property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollTop  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_TOP, this).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollWidth property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollWidth  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_WIDTH, this).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollHeight property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollHeight  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_HEIGHT, this).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The width of the left border.
     */
    EyesRemoteWebElement.prototype.getBorderLeftWidth = function () {
        return this.getComputedStyleInteger("border-left-width");
    };

    /**
     * @return {promise.Promise.<int>} The width of the right border.
     */
    EyesRemoteWebElement.prototype.getBorderRightWidth = function () {
        return this.getComputedStyleInteger("border-right-width");
    };

    /**
     * @return {promise.Promise.<int>} The width of the top border.
     */
    EyesRemoteWebElement.prototype.getBorderTopWidth = function () {
        return this.getComputedStyleInteger("border-top-width");
    };

    /**
     * @return {promise.Promise.<int>} The width of the bottom border.
     */
    EyesRemoteWebElement.prototype.getBorderBottomWidth = function () {
        return this.getComputedStyleInteger("border-bottom-width");
    };

    /**
     * Scrolls to the specified location inside the element.
     * @param {{x: number, y: number}} location The location to scroll to.
     * @return {promise.Promise.<void>}
     */
    EyesRemoteWebElement.prototype.scrollTo = function (location) {
        return this._eyesDriver.executeScript(JS_SCROLL_TO_FORMATTED_STR(location.x, location.y), this);
    };

    /**
     * @return {promise.Promise.<string>} The overflow of the element.
     */
    EyesRemoteWebElement.prototype.getOverflow = function () {
        return this._eyesDriver.executeScript(JS_GET_OVERFLOW, this);
    };

    /**
     * @param {string} overflow The overflow to set
     * @return {promise.Promise.<void>} The overflow of the element.
     */
    EyesRemoteWebElement.prototype.setOverflow = function (overflow) {
        return this._eyesDriver.executeScript(JS_SET_OVERFLOW_FORMATTED_STR(overflow), this);
    };

    module.exports = EyesRemoteWebElement;
}());
