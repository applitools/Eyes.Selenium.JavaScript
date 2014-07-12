/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

;(function() {
    "use strict";

    var ScreenshotTaker = require('./ScreenshotTaker'),
        GeneralUtils = require('./GeneralUtils'),
        Promise = require('bluebird'),
        webdriver = require('selenium-webdriver');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} remoteWebDriver
     * @param {Object} eyes - an instance of Eyes
     *
     *
     **/
    function EyesWebDriver(remoteWebDriver, eyes) {
        this._eyes = eyes;
        // TODO - leave out click, sendKeys and takeScreenshot - we need to handle them first
        GeneralUtils.extend(this, remoteWebDriver);
        this._driver = remoteWebDriver;
        this._screenshotTaker = undefined;
    }

    EyesWebDriver.prototype.init = function () {
        return new Promise(function (resolve) {
            this._driver.getCapabilities().then(function (capabilities) {
                if (!capabilities.has(webdriver.Capability.TAKES_SCREENSHOT)) {
                    this._screenshotTaker = new ScreenshotTaker();
                }
                resolve();
            }.bind(this));
        }.bind(this));
    };

    module.exports = EyesWebDriver;
}());
