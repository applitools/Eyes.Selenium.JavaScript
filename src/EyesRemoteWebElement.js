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
        GeneralUtils = EyesUtils.GeneralUtils,
        GeometryUtils = EyesUtils.GeometryUtils;

    var JS_GET_SCROLL_LEFT = "return arguments[0].scrollLeft;";

    var JS_GET_SCROLL_TOP = "return arguments[0].scrollTop;";

    var JS_GET_SCROLL_WIDTH = "return arguments[0].scrollWidth;";

    var JS_GET_SCROLL_HEIGHT = "return arguments[0].scrollHeight;";

    var JS_GET_OVERFLOW = "return arguments[0].style.overflow;";

    var JS_GET_LOCATION = "var rect = arguments[0].getBoundingClientRect(); return [rect.left, rect.top]";

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
     * @param {WebElement} remoteWebElement
     * @param {EyesWebDriver} eyesDriver
     * @param {Logger} logger
     * @augments WebElement
     **/
    function EyesRemoteWebElement(remoteWebElement, eyesDriver, logger) {
        this._element = remoteWebElement;
        this._logger = logger;
        this._eyesDriver = eyesDriver;
        GeneralUtils.mixin(this, remoteWebElement);

        // remove then method, which comes from thenableWebElement (Selenium 3+)
        delete this.then;
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
            return that._element.sendKeys.apply(that._element, args);
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
        return this._eyesDriver.executeScript(JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle), this._element);
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
        return this._eyesDriver.executeScript(JS_GET_SCROLL_LEFT, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollTop property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollTop  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_TOP, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollWidth property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollWidth  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_WIDTH, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    };

    /**
     * @return {promise.Promise.<int>} The value of the scrollHeight property of the element.
     */
    EyesRemoteWebElement.prototype.getScrollHeight  = function () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_HEIGHT, this._element).then(function (value) {
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
     * @return {!promise.Thenable<{width: number, height: number}>} element's size
     */
    EyesRemoteWebElement.prototype.getSize = function () {
        return this._element.getSize().then(function (value) {
            return GeometryUtils.createSize(value.width, value.height);
        });
    };

    /**
     * @return {!promise.Thenable<{x: number, y: number}>} element's location
     */
    EyesRemoteWebElement.prototype.getLocation = function () {
        // The workaround is similar to Java one,
        // https://github.com/applitools/eyes.sdk.java3/blob/master/eyes.selenium.java/src/main/java/com/applitools/eyes/selenium/EyesRemoteWebElement.java#L453
        // but we can't get raw data (including decimal values) from remote Selenium webdriver
        // and therefore we should use our own client-side script for retrieving exact values and rounding up them

        // this._element.getLocation()
        return this._eyesDriver.executeScript(JS_GET_LOCATION, this._element).then(function (value) {
            var x = Math.ceil(value[0]) || 0;
            var y = Math.ceil(value[1]) || 0;
            return GeometryUtils.createLocation(x, y);
        });
    };

    /**
     * Scrolls to the specified location inside the element.
     * @param {{x: number, y: number}} location The location to scroll to.
     * @return {promise.Promise.<void>}
     */
    EyesRemoteWebElement.prototype.scrollTo = function (location) {
        return this._eyesDriver.executeScript(JS_SCROLL_TO_FORMATTED_STR(location.x, location.y), this._element);
    };

    /**
     * @return {promise.Promise.<string>} The overflow of the element.
     */
    EyesRemoteWebElement.prototype.getOverflow = function () {
        return this._eyesDriver.executeScript(JS_GET_OVERFLOW, this._element);
    };

    /**
     * @param {string} overflow The overflow to set
     * @return {promise.Promise.<void>} The overflow of the element.
     */
    EyesRemoteWebElement.prototype.setOverflow = function (overflow) {
        return this._eyesDriver.executeScript(JS_SET_OVERFLOW_FORMATTED_STR(overflow), this._element);
    };

    /**
     * @return {WebElement} The original element object
     */
    EyesRemoteWebElement.prototype.getRemoteWebElement = function () {
        return this._element;
    };

    module.exports = EyesRemoteWebElement;
}());
