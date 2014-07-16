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
        EyesWebDriver = require('./EyesWebDriver'),
        ViewportSize = require('./ViewportSize'),
        webdriver = require('selenium-webdriver');

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

    // TODO: instance method
    Eyes.setApiKey = function (apiKey) {
        EyesBase.apiKey = apiKey;
    };

    Eyes.prototype.open = function (driver, appName, testName, viewportSize, matchLevel, failureReports) {
        var flow = webdriver.promise.controlFlow();
        return flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes open');
            try {
                EyesBase.prototype.open.call(this, appName, testName, viewportSize, matchLevel, failureReports)
                    .then(function () {
                        console.log('inner eyes open returned - fulfilling');
                        this._driver = driver; //TODO: new EyesWebDriver(driver, this);
                        // this._driver.init().then(function () {
                        deferred.fulfill(this._driver);
                        //}.bind(this));
                    }.bind(this));
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.close = function (throwEx) {
        var flow = webdriver.promise.controlFlow();
        return flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes close');
            try {
                EyesBase.prototype.close.call(this, throwEx)
                    .then(function () {
                        console.log('inner eyes close returned - fulfilling');
                        deferred.fulfill(this._driver);
                    }.bind(this));
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkWindow = function (tag) {
        var flow = webdriver.promise.controlFlow();
        return flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes check window');
            try {
                EyesBase.prototype.checkWindow.call(this, tag, false).then(function () {
                        console.log('inner eyes check window returned - fulfilling');
                        deferred.fulfill();
                    }.bind(this),
                    function (err) {
                        console.log(err);
                        deferred.reject(err);
                    });
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            console.log('returning check window promise');
            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype._waitTimeout = function (ms) {
        return webdriver.promise.controlFlow().timeout(ms);
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
