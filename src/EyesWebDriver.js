/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

;(function() {
    "use strict";

    var ScreenshotTaker = require('./ScreenshotTaker'),
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
        this._driver = remoteWebDriver;
        this._screenshotTaker = undefined;
    }

    EyesWebDriver.prototype.init = function () {
        return new Promise(function (resolve) {
            this._driver.getCapabilities().then(function (capabilities) {
                if (!capabilities.has(webdriver.Capability.TAKES_SCREENSHOT)) {
                    this._screenshotTaker = new ScreenshotTaker(remoteWebDriver.commandExecutor.url,
                        remoteWebDriver.sessionId);
                }
                resolve();
            }.bind(this));
        }.bind(this));
    };

    module.exports = EyesWebDriver;
}());
