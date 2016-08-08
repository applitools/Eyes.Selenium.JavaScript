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

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} remoteWebElement
     * @param {EyesWebDriver} eyesDriver
     * @param {Object} logger
     **/
    function EyesRemoteWebElement(remoteWebElement, eyesDriver, logger) {
        this._element = remoteWebElement;
        this._logger = logger;
        this._eyes = eyesDriver;
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

    EyesRemoteWebElement.registerSendKeys = function (element, eyes, logger, args) {
        var text = args.join('');
        logger.verbose("registerSendKeys: text is", text);
        return _getBounds(element).then(function (rect) {
            eyes.addKeyboardTrigger(rect, text);
        });
    };

    EyesRemoteWebElement.prototype.sendKeys = function () {
        var that = this, args = Array.prototype.slice.call(arguments, 0);
        return EyesRemoteWebElement.registerSendKeys(that._element, that._eyes, that._logger, args).then(function () {
            return that._element.sendKeys.call(that._element, args);
        });
    };

    EyesRemoteWebElement.registerClick = function (element, eyes, logger) {
        logger.verbose("apply click on element");
        return _getBounds(element).then(function (rect) {
            var offset = {x: rect.width / 2, y: rect.height / 2};
            eyes.addMouseTrigger(MouseAction.Click, rect, offset);
        });
    };

    EyesRemoteWebElement.prototype.click = function () {
        var that = this;
        that._logger.verbose("click on element");
        return EyesRemoteWebElement.registerClick(that._element, that._eyes, that._logger).then(function () {
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
