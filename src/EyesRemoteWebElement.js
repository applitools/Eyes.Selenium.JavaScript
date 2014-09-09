/*
 ---

 name: EyesRemoteWebElement

 description: Wraps a Remote Web Element.

 ---
 */

(function () {
    "use strict";

    var EyesSDK = require('eyes.sdk'),
        GeneralUtils = EyesSDK.GeneralUtils,
        MouseAction = EyesSDK.Triggers.MouseAction;

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} remoteWebElement
     * @param {Object} eyes
     * @param {Object} logger
     *
     **/
    function EyesRemoteWebElement(remoteWebElement, eyes, logger) {
        this._element = remoteWebElement;
        this._logger = logger;
        this._eyes = eyes;
        GeneralUtils.mixin(this, remoteWebElement);
    }

    function _getRectangle(location, size) {
        size = size || { height: 0, width: 0 };
        location = location || { x: 0, y: 0 };

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

    EyesRemoteWebElement.prototype.getBounds = function () {
        var that = this;
        return that._element.getLocation().then(function (location) {
            return that._element.getSize().then(function (size) {
                return _getRectangle(location, size);
            }, function () {
                return _getRectangle(location);
            });
        }, function () {
            return _getRectangle();
        });
    };

    EyesRemoteWebElement.prototype.sendKeys = function () {
        var that = this,
            args = Array.prototype.slice.call(arguments, 0),
            text = args.join('');
        that._logger.verbose("sendKeys: text is", text);
        return that.getBounds().then(function (rect) {
            that._eyes.addKeyboardTrigger(rect, text);
            that._logger.verbose("calling element sendKeys: text is", text);
            return that._element.sendKeys.call(that._element, args);
        });
    };

    EyesRemoteWebElement.prototype.click = function () {
        var that = this;
        return that.getBounds().then(function (rect) {

            var offset = { x: rect.width / 2, y: rect.height / 2 };
            that._eyes.addMouseTrigger(MouseAction.Click, rect, offset);

            return that._element.click();
        });
    };

    EyesRemoteWebElement.prototype.findElement = function (locator) {
        var that = this;
        return this._element.findElement(locator).then(function (element) {
            return new EyesRemoteWebElement(element, that._eyes, that._logger);
        });
    };

    EyesRemoteWebElement.prototype.findElements = function (locator) {
        var that = this;
        return this._element.findElements(locator).then(function (elements) {
            return elements.map(function (element) {
                return new EyesRemoteWebElement(element, that._eyes, that._logger);
            });
        });
    };

    module.exports = EyesRemoteWebElement;
}());
