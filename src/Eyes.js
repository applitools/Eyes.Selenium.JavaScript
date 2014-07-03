/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 provides: [Eyes]
 requires: [GeneralUtils, ServerConnector, EyesCore]

 ---
 */

;(function() {
    "use strict";

    var EyesCore = require('./EyesCore'),
        GeneralUtils = require('./GeneralUtils'),
        Promise = require("bluebird");

    var _driver,
        _core;


    function _open(driver, appName, testName, viewPortSize, matchLevel, failureReports) {
        _driver = driver;
        _core.open(appName, testName, viewPortSize, matchLevel, failureReports);
    }

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUrl
     *
     **/
    function Eyes(serverUrl) {
        _core = new EyesCore(serverUrl);
    }

    EyesCore.agentId = 'javascript/0.0';

    Eyes.setApiKey = function(apiKey) {
        EyesCore.apiKey = apiKey;
    };

    Eyes.prototype.open = function(driver, appName, testName, viewPortSize, matchLevel, failureReports) {
        return _open(driver, appName, testName, viewPortSize, matchLevel, failureReports);
    };

    module.exports = Eyes;
}());
