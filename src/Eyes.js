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
        EyesWebDriver = require('./EyesWebDriver');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUrl
     *
     **/
    function Eyes(serverUrl) {
        EyesBase.call(this, serverUrl);
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    EyesBase.agentId = 'javascript/0.0';

    Eyes.setApiKey = function (apiKey) {
        EyesBase.apiKey = apiKey;
    };

    Eyes.prototype.open = function (driver, appName, testName, viewPortSize, matchLevel, failureReports) {
        return new Promise(function (resolve) {
            this._driver = new EyesWebDriver(driver, this);
            this._driver.init().then(function () {
                EyesBase.prototype.open.call(this, appName, testName, viewPortSize, matchLevel, failureReports);
                resolve(this._driver);
            }.bind(this));
        }.bind(this));
    };

    Eyes.prototype.checkWindow = function (tag) {
        EyesBase.prototype.checkWindow.call(this, tag);
    };

    module.exports = Eyes;
}());
