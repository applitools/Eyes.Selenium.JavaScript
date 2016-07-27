/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

(function () {
  "use strict";

  var EyesSDK = require('eyes.sdk'),
    EyesUtils = require('eyes.utils'),
    Frame = require('./Frame'),
    FrameChain = require('./FrameChain'),
    EyesRemoteWebElement = require('./EyesRemoteWebElement'),
    ScrollPositionProvider = require('./ScrollPositionProvider'),
    EyesSeleniumUtils = require('./EyesSeleniumUtils'),
    EyesTargetLocator = require('./EyesTargetLocator'),
    BordersAwareElementContentLocationProvider = require('./BordersAwareElementContentLocationProvider');
  var RectangleSize = EyesSDK.RectangleSize,
    Location = EyesSDK.Location,
    GeneralUtils = EyesUtils.GeneralUtils;

  /**
   *
   * C'tor = initializes the module settings
   *
   * @param {Object} remoteWebDriver
   * @param {Eyes} eyes An instance of Eyes
   * @param {Object} logger
   * @param {PromiseFactory} promiseFactory
   *
   **/
  function EyesWebDriver(remoteWebDriver, eyes, logger, promiseFactory) {
    this._eyes = eyes;
    this._logger = logger;
    this._promiseFactory = promiseFactory;
    this._defaultContentViewportSize = null;
    this._frameChain = new FrameChain(this._logger, null);
    this.setRemoteWebDriver(remoteWebDriver);
  }

  //noinspection JSUnusedGlobalSymbols
  EyesWebDriver.prototype.getEyes = function () {
    return this._eyes;
  };

  //noinspection JSUnusedGlobalSymbols
  EyesWebDriver.prototype.setEyes = function (eyes) {
    this._eyes = eyes;
  };

  //noinspection JSUnusedGlobalSymbols
  EyesWebDriver.prototype.getRemoteWebDriver = function () {
    return this._driver;
  };

  EyesWebDriver.prototype.setRemoteWebDriver = function (remoteWebDriver) {
    this._driver = remoteWebDriver;
    GeneralUtils.mixin(this, remoteWebDriver);
  };

  EyesWebDriver.prototype.getUserAgent = function () {
    return this._driver.executeScript('return navigator.userAgent');
  };

  EyesWebDriver.prototype.findElement = function (locator) {
    var that = this;
    return new EyesRemoteWebElement(that._driver.findElement(locator), that, that._logger);
  };

  EyesWebDriver.prototype.findElements = function (locator) {
    var that = this;
    return this._driver.findElements(locator).then(function (elements) {
      return elements.map(function (element) {
        return new EyesRemoteWebElement(element, that, that._logger);
      });
    });
  };

  EyesWebDriver.prototype.findElementByCssSelector = function (cssSelector) {
    return this.findElement(By.cssSelector(cssSelector));
  };

  EyesWebDriver.prototype.findElementsByCssSelector = function (cssSelector) {
    return this.findElements(By.cssSelector(cssSelector));
  };

  EyesWebDriver.prototype.findElementById = function (name) {
    return this.findElement(By.id(name));
  };

  EyesWebDriver.prototype.findElementsById = function (name) {
    return this.findElements(By.id(name));
  };

  EyesWebDriver.prototype.findElementByName = function (name) {
    return this.findElement(By.name(name));
  };

  EyesWebDriver.prototype.findElementsByName = function (name) {
    return this.findElements(By.name(name));
  };

//  EyesWebDriver.prototype.init = function () {
//    return new Promise(function (resolve) {
//      this._driver.getCapabilities().then(function (capabilities) {
//        if (!capabilities.has(webdriver.Capability.TAKES_SCREENSHOT)) {
//          this._screenShotTaker = new ScreenShotTaker();
//        }
//        resolve();
//      }.bind(this));
//    }.bind(this));
//  };

  /**
   * @returns {EyesTargetLocator}
   */
  EyesWebDriver.prototype.switchTo = function () {
    var that = this;
    this._logger.verbose("switchTo()");

    var OnWillSwitch = function () {};

    /**
     * @param {EyesTargetLocator.TargetType} targetType
     * @param {EyesRemoteWebElement|WebElement} targetFrame
     * @returns {!promise.Promise<void>}
     */
    OnWillSwitch.willSwitchToFrame = function (targetType, targetFrame) {
      that._logger.verbose("willSwitchToFrame()");
      switch(targetType) {
        case EyesTargetLocator.TargetType.DEFAULT_CONTENT:
          that._logger.verbose("Default content.");
          that._frameChain.clear();
          //return that.controlFlow().execute(function () {});
          return that._promiseFactory.makePromise(function (resolve) {
              resolve();
          });
        case EyesTargetLocator.TargetType.PARENT_FRAME:
          that._logger.verbose("Parent frame.");
          that._frameChain.pop();
            return that._promiseFactory.makePromise(function (resolve) {
                resolve();
            });
        default: // Switching into a frame
          that._logger.verbose("Frame");

          var frameId, pl, sp, size;
          return targetFrame.getId()
            .then(function(_id) {
              frameId = _id;
              return targetFrame.getLocation();
            })
            .then(function(_location) {
              pl = _location;
              return targetFrame.getSize();
            })
            .then(function(_size) {
              size = new RectangleSize(_size.width, _size.height);
              return new ScrollPositionProvider(that._logger, that._driver).getCurrentPosition();
            })
            .then(function(_scrollPosition) {
              sp = _scrollPosition;

              // Get the frame's content location.
              var baeclp = new BordersAwareElementContentLocationProvider(that._logger, that._promiseFactory);
              return baeclp.getLocation(targetFrame, new Location(pl.x, pl.y));
            }).then(function (contentLocation) {
              that._frameChain.push(new Frame(that._logger, targetFrame, frameId, contentLocation, size, sp));
              that._logger.verbose("Done!");
            });
      }
    };

    OnWillSwitch.willSwitchToWindow = function (nameOrHandle) {
      that._logger.verbose("willSwitchToWindow()");
      that._frameChain.clear();
      that._logger.verbose("Done!");
    };

    return new EyesTargetLocator(this._logger, this, this._driver.switchTo(), OnWillSwitch);
  };

  /**
   * @param {boolean} forceQuery If true, we will perform the query even if we have a cached viewport size.
   * @return {!promise.Promise<RectangleSize>} The viewport size of the default content (outer most frame).
   */
  EyesWebDriver.prototype.getDefaultContentViewportSize = function (forceQuery) {
    var that = this;
    return this._promiseFactory.makePromise(function (resolve) {
      that._logger.verbose("getDefaultContentViewportSize()");

      if (that._defaultContentViewportSize != null && !forceQuery) {
        that._logger.verbose("Using cached viewport size: " + that._defaultContentViewportSize);
        resolve(that._defaultContentViewportSize);
        return;
      }

      var currentFrames = that.getFrameChain();
      // Optimization
      if (currentFrames.size() > 0) {
        return that.switchTo().defaultContent().then(function () {
          that._logger.verbose("Extracting viewport size...");
          return EyesSeleniumUtils.extractViewportSize(that._logger, that._driver, that._eyes, that._promiseFactory);
        }).then(function (viewportSize) {
            that._defaultContentViewportSize = viewportSize;
            that._logger.verbose("Done! Viewport size: " + that._defaultContentViewportSize);
            return that.switchTo().frames(currentFrames);
        }).then(function () {
          resolve(that._defaultContentViewportSize);
        });
      }

      return EyesSeleniumUtils.extractViewportSize(that._logger, that._driver, that._eyes, that._promiseFactory).then(function (viewportSize) {
        that._defaultContentViewportSize = viewportSize;
        that._logger.verbose("Done! Viewport size: " + that._defaultContentViewportSize);
        resolve(that._defaultContentViewportSize);
      });
    });
  };

  /**
   *
   * @return {FrameChain} A copy of the current frame chain.
   */
  EyesWebDriver.prototype.getFrameChain = function () {
    return new FrameChain(this._logger, this._frameChain);
  };

  module.exports = EyesWebDriver;
}());
