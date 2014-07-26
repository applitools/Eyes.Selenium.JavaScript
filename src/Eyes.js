/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [eyes.sdk, EyesWebDriver, ViewportSize, selenium-webdriver]

 ---
 */

;(function() {
    "use strict";

    var EyesSDK = require('eyes.sdk');
    var EyesBase = EyesSDK.EyesBase,
        EyesWebDriver = require('./EyesWebDriver'),
        ViewportSize = require('./ViewportSize'),
        PromiseFactory = EyesSDK.EyesPromiseFactory,
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

    EyesBase.agentId = 'selenium-js/0.0';

    // TODO: instance method
    Eyes.setApiKey = function (apiKey) {
        EyesBase.apiKey = apiKey;
    };

    Eyes.prototype.open = function (driver, appName, testName, viewportSize, matchLevel, failureReports) {
        var flow = this._flow = driver.controlFlow();
        PromiseFactory.setPromiseHandler(function (asyncAction) {
            return flow.execute(function () {
                var deferred = webdriver.promise.defer();
                asyncAction(deferred);
                return deferred.promise;
            });
        });
        return this._flow.execute(function () {
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
        return this._flow.execute(function () {
            var deferred = webdriver.promise.defer();
            console.log('execution began for eyes close');
            EyesBase.prototype.close.call(this, throwEx)
                .then(function (results) {
                    console.log('inner eyes close returned - fulfilling');
                    deferred.fulfill(results);
                }.bind(this), function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }.bind(this));
    };

    Eyes.prototype.checkWindow = function (tag) {
        return this._flow.execute(function () {
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
        return this._flow.timeout(ms);
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
