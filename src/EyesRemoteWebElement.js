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
   *
   **/
  function EyesRemoteWebElement(remoteWebElement, eyesDriver, logger) {
    this._element = remoteWebElement;
    this._logger = logger;
    this._eyes = eyesDriver;
    GeneralUtils.mixin(this, remoteWebElement);
  }

  /**
   * @return {string}
   */
  EyesRemoteWebElement.JS_GET_COMPUTED_STYLE_FORMATTED_STR = function (propStyle) {
    return "var elem = arguments[0]; " +
      "var styleProp = '" + propStyle + "'; " +
      "if (window.getComputedStyle) { " +
      "return window.getComputedStyle(elem, null)" +
      ".getPropertyValue(styleProp);" +
      "} else if (elem.currentStyle) { " +
      "return elem.currentStyle[styleProp];" +
      "} else { " +
      "return null;" +
      "}";
  };

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

  /**
   * Returns the computed value of the style property for the current element.
   * @param {string} propStyle The style property which value we would like to extract.
   * @return {!promise.Promise<string>} The value of the style property of the element, or {@code null}.
   */
  EyesRemoteWebElement.prototype.getComputedStyle = function (propStyle) {
    var scriptToExec = EyesRemoteWebElement.JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle);
    return this.getDriver().executeScript(scriptToExec, this).then(function(computedStyle) {
      return computedStyle;
    });
  };

  EyesRemoteWebElement.prototype.sendKeys = function () {
    var that = this,
      args = Array.prototype.slice.call(arguments, 0),
      text = args.join('');
    that._logger.verbose("sendKeys: text is", text);
    return that.getBounds().then(function (rect) {
      that._eyes.getEyes().addKeyboardTrigger(rect, text);
      that._logger.verbose("calling element sendKeys: text is", text);
      return that._element.sendKeys.call(that._element, args);
    });
  };

  EyesRemoteWebElement.prototype.click = function () {
    var that = this;
    that._logger.verbose("click on element");
    return that.getBounds().then(function (rect) {
      var offset = { x: rect.width / 2, y: rect.height / 2 };
      that._eyes.getEyes().addMouseTrigger(MouseAction.Click, rect, offset);

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
