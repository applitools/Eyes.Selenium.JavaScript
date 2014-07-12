/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [GeneralUtils, ServerConnector, EyesBase]

 ---
 */

;(function() {
    "use strict";

    var EyesBase = require('./EyesBase'),
        Promise = require('bluebird'),
        EyesWebDriver = require('./EyesWebDriver'),
        ViewportSize = require('./ViewportSize');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUrl
     * @param {Number} matchTimeout
     * @param {Boolean} isDisabled - set to true to disable Applitools Eyes and use the webdriver directly.
     *
     **/
    function Eyes(serverUrl, matchTimeout, isDisabled) {
        EyesBase.call(this, serverUrl || EyesBase.DEFAULT_EYES_SERVER, matchTimeout || 2000, isDisabled);
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    EyesBase.agentId = 'javascript/0.0';

    Eyes.setApiKey = function (apiKey) {
        EyesBase.apiKey = apiKey;
    };

    Eyes.prototype.open = function (driver, appName, testName, viewportSize, matchLevel, failureReports) {
        // TODO: assign the control flow here for later use
        return new Promise(function (resolve, reject) {
            try {
                EyesBase.prototype.open.call(this, appName, testName, viewportSize, matchLevel, failureReports)
                    .then(function () {
                        this._driver = driver; //TODO: new EyesWebDriver(driver, this);
                        //this._driver.init().then(function () {
                        resolve(this._driver);
                        //}.bind(this));
                    }.bind(this));
            } catch (err) {
                console.log(err);
                reject(err);
            }
        }.bind(this));
    };

    Eyes.prototype.checkWindow = function (tag) {
        return EyesBase.prototype.checkWindow.call(this, tag, false);
    };

    Eyes.prototype.getScreenshot = function () {
        return this._driver.takeScreenshot();
    };

    Eyes.prototype.getTitle = function () {
        return this._driver.getTitle();
    };

    Eyes.prototype.getViewportSize = function () {
        return ViewportSize.getViewportSize(this._driver);
    };

    Eyes.prototype.setViewportSize = function (size) {
        return ViewportSize.setViewportSize(this._driver, size);
    };

    module.exports = Eyes;
}());
