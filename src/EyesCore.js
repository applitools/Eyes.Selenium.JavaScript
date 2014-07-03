/*
 ---

 name: EyesCore

 description: Core/Base class for Eyes - to allow code reuse for different SDKs (images, selenium, etc).

 provides: [EyesCore]

 ---
 */

;(function() {
    "use strict";

    var ServerConnector = require('./ServerConnector')

    // constants
    var DEFAULT_EYES_SERVER = 'https://eyessdk.applitools.com';

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
    }

    // private members
    var _viewportSize,
        _serverConnector,
        _serverUrl,
        _matchTimeout,
        _runningSession,
        _matchLevel,
        _failureReports,
        _userInputs,
        _saveNewTests,
        _saveFailedTests,
        _agentId,
        _apiKey,
        _isOpen,
        _appName,
        _testName,
        _hostApp,
        _hostOs,
        _batch,
        _matchWindowTask,
        _sessionStartInfo,
        _shouldMatchWindowRunOnceOnTimeout;

    
    function _open(appName, testName, viewPortSize, matchLevel, failureReports) {
        _matchLevel = matchLevel || _MatchLevels.Strict;
        _failureReports = failureReports ||_FailureReports.OnClose;
        _userInputs = [];
        _viewportSize = viewPortSize;
        _testName = testName;
        _appName = appName;
    }

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUrl
     *
     **/
    function EyesCore(serverUrl) {
        if (!EyesCore.apiKey) {
            var err = 'API key is missing! Please set it via Eyes.setApiKey';
            console.error(err);
            throw err;
        }

        _serverUrl = serverUrl || DEFAULT_EYES_SERVER;
        _matchTimeout = 2000; //ms
        _matchLevel = _MatchLevels.Strict;
        _failureReports = _FailureReports.OnClose;
        _userInputs = [];
        _saveNewTests = true;
        _saveFailedTests = false;
        _serverConnector = new ServerConnector(_serverUrl, EyesCore.agentId, EyesCore.apiKey);
    }

    EyesCore.prototype.open = function (appName, testName, viewPortSize, matchLevel, failureReports) {
        return _open(appName, testName, viewPortSize, matchLevel, failureReports);
    };

    EyesCore.MatchLevels = Object.freeze(_MatchLevels);
    EyesCore.FailureReports = Object.freeze(_FailureReports);

    module.exports = EyesCore;
}());
