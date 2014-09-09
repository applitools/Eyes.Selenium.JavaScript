/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

(function () {
    "use strict";

    var EyesSDK = require('eyes.sdk'),
        GeneralUtils = EyesSDK.GeneralUtils,
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        webdriver = require('selenium-webdriver');

    //var webdriver = require('selenium-webdriver');
        //ScreenShotTaker = EyesSDK.ScreenShotTaker;

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} remoteWebDriver
     * @param {Object} eyes - an instance of Eyes
     * @param {Object} logger
     *
     **/
    function EyesWebDriver(remoteWebDriver, eyes, logger) {
        this._eyes = eyes;
        this._logger = logger;
        this.setRemoteWebDriver(remoteWebDriver);
    }

    EyesWebDriver.prototype.getEyes = function () {
        return this._eyes;
    };

    EyesWebDriver.prototype.setEyes = function (eyes) {
        this._eyes = eyes;
    };

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
        return new EyesRemoteWebElement(that._driver.findElement(locator), that._eyes, that._logger);
    };

    EyesWebDriver.prototype.findElements = function (locator) {
        var that = this;
        return this._driver.findElements(locator).then(function (elements) {
            return elements.map(function (element) {
                return new EyesRemoteWebElement(element, that._eyes, that._logger);
            });
        });
    };

//    EyesWebDriver.prototype.init = function () {
//        return new Promise(function (resolve) {
//            this._driver.getCapabilities().then(function (capabilities) {
//                if (!capabilities.has(webdriver.Capability.TAKES_SCREENSHOT)) {
//                    this._screenShotTaker = new ScreenShotTaker();
//                }
//                resolve();
//            }.bind(this));
//        }.bind(this));
//    };

    module.exports = EyesWebDriver;
}());
