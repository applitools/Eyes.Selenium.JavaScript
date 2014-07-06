/*
 ---

 name: EyesBase

 description: Core/Base class for Eyes - to allow code reuse for different SDKs (images, selenium, etc).

 provides: [EyesBase]

 ---
 */

;(function() {
    "use strict";

    var ServerConnector = require('./ServerConnector')

    var _MatchLevels = {
        // Images do not necessarily match.
        None: 'None',

        // Images have the same layout.
        Layout: 'Layout',

        // Images have the same content.
        Content: 'Content',

        // Images are nearly identical.
        Strict: 'Strict',

        // Images are identical.
        Exact: 'Exact'
    };

    var _FailureReports = {
        // Failures are reported immediately when they are detected.
        Immediate: 'Immediate',
        // Failures are reported when tests are completed (i.e., when Eyes.close() is called).
        OnClose: 'OnClose'
    };

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUrl
     *
     **/
    function EyesBase(serverUrl) {
        if (serverUrl) {
            if (!EyesBase.apiKey) {
                var err = 'API key is missing! Please set it via Eyes.setApiKey';
                console.error(err);
                throw err;
            }

            this._serverUrl = serverUrl || EyesBase.DEFAULT_EYES_SERVER;
            this._matchTimeout = 2000; //ms
            this._matchLevel = EyesBase.MatchLevels.Strict;
            this._failureReports = EyesBase.FailureReports.OnClose;
            this._userInputs = [];
            this._saveNewTests = true;
            this._saveFailedTests = false;
            this._serverConnector = new ServerConnector(this._serverUrl, EyesBase.agentId, EyesBase.apiKey);
        }
    }

    EyesBase.prototype.open = function (appName, testName, viewPortSize, matchLevel, failureReports) {
        this._matchLevel = matchLevel || EyesBase.MatchLevels.Strict;
        this._failureReports = failureReports || EyesBase.FailureReports.OnClose;
        this._userInputs = [];
        this._viewportSize = viewPortSize;
        this._testName = testName;
        this._appName = appName;
    };

    EyesBase.prototype.checkWindow = function(tag) {

    };

    EyesBase.DEFAULT_EYES_SERVER = 'https://eyessdk.applitools.com';
    EyesBase.MatchLevels = Object.freeze(_MatchLevels);
    EyesBase.FailureReports = Object.freeze(_FailureReports);

    module.exports = EyesBase;
}());
