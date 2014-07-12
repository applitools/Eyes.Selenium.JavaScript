/*
 ---

 name: EyesBase

 description: Core/Base class for Eyes - to allow code reuse for different SDKs (images, selenium, etc).

 provides: [EyesBase]

 ---
 */

;(function() {
    "use strict";

    var ServerConnector = require('./ServerConnector'),
        MatchWindowTask = require('./MatchWindowTask'),
        GeneralUtils = require('./GeneralUtils'),
        Promise = require('bluebird');

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
    function EyesBase(serverUrl, matchTimeout, isDisabled) {
        if (serverUrl) {
            if (!EyesBase.apiKey) {
                var err = 'API key is missing! Please set it via Eyes.setApiKey';
                console.error(err);
                throw err;
            }

            this._serverUrl = serverUrl;
            this._matchTimeout = matchTimeout;
            this._matchLevel = EyesBase.MatchLevels.Strict;
            this._failureReports = EyesBase.FailureReports.OnClose;
            this._userInputs = [];
            this._saveNewTests = true;
            this._saveFailedTests = false;
            this._serverConnector = new ServerConnector(this._serverUrl, EyesBase.agentId, EyesBase.apiKey);
            this._isDisabled = isDisabled;
        }
    }

    EyesBase.prototype.open = function (appName, testName, viewportSize, matchLevel, failureReports) {
        return new Promise(function (resolve, reject) {
            if (this._isDisabled) {
                console.log("Eyes Open ignored - disabled");
                resolve();
                return;
            }

            if (this._isOpen)
            {
                this.abortIfNotClosed();
                var errMsg = "A test is already running";
                console.log(errMsg);
                reject(errMsg);
            }

            this._isOpen = true;
            this._matchLevel = matchLevel || EyesBase.MatchLevels.Strict;
            this._failureReports = failureReports || EyesBase.FailureReports.OnClose;
            this._userInputs = [];
            this._viewportSize = viewportSize;
            this._testName = testName;
            this._appName = appName;
            resolve();
        }.bind(this));
    };

    EyesBase.prototype.close = function (throwEx) {
        return new Promise(function (resolve, reject) {
            if (this._isDisabled) {
                console.log("Eyes Close ignored - disabled");
                resolve();
                return;
            }

            if (!this._isOpen)
            {
                var errMsg = "close called with Eyes not open";
                console.log(errMsg);
                reject(errMsg);
                return;
            }

            this._isOpen = false;

            if (!this._runningSession)
            {
                console.log("Close(): Server session was not started");
                resolve();
                return;
            }

            this._serverConnector.endSession(this._runningSession, false, this._runningSession.isNewSession)
                .then(function () {
                    resolve();
                });
        }.bind(this));
    };

    EyesBase.prototype.checkWindow = function(tag, ignoreMismatch, retryTimeout, getRegionFunc) {
        retryTimeout = retryTimeout || -1;
        getRegionFunc = getRegionFunc || function () {
            return {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            };
        };

        return new Promise(function (resolve, reject) {
            if (this._isDisabled) {
                console.log("Eyes checkWindow ignored - disabled");
                resolve();
                return;
            }

            if (!this._isOpen)
            {
                var errMsg = "checkWindow called with Eyes not open";
                console.log(errMsg);
                reject(errMsg);
                return;
            }

            tag = tag || '';
            var region = getRegionFunc();

            this.startSession().then(function() {
                this._matchWindowTask = new MatchWindowTask(this._serverConnector,
                    this._runningSession, this._matchTimeout, function (region) {
                        return new Promise (function (res, rej) {
                            this.getScreenshot().then(function (uncompressed) {
                                // TODO - handle region here
                                // --->>>
                                //
                                var data = {appOutput: {}};
                                if (uncompressed) {
                                    data.screenShot = new Buffer(uncompressed, 'base64').toString('binary');
                                    data.appOutput.screenshot64 = uncompressed;
                                }
                                this.getTitle().then(function(title) {
                                    data.appOutput.title = title;
                                    res(data);
                                }.bind(this));
                            }.bind(this));
                        }.bind(this));
                    }.bind(this));

                this._matchWindowTask.matchWindow(this._userInputs, region, tag, this._shouldMatchWindowRunOnceOnTimeout,
                    ignoreMismatch, retryTimeout).then(function(result) {
                        if (!ignoreMismatch)
                        {
                            this._userInputs = [];
                        }

                        if (!result.asExpected)
                        {
                            this._shouldMatchWindowRunOnceOnTimeout = true;

                            if (this._failureReports === EyesBase.FailureReports.Immediate)
                            {
                                reject("Mismatch found in '" + this._sessionStartInfo.scenarioIdOrName + "' of '" +
                                    this._sessionStartInfo.appIdOrName + "'");
                            }
                        }

                        resolve(result);
                    }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    EyesBase.prototype.startSession = function () {
        return new Promise(function(resolve, reject) {
            if (this._runningSession) {
                resolve();
                return;
            }

            var promise;
            if (!this._viewportSize)
            {
                promise = this.getViewportSize();
            }
            else
            {
                promise = this.setViewportSize(this._viewportSize);
            }

            promise.then(function (result) {
                this._viewportSize = this._viewportSize || result;
                var testBatch = this._batch;
                if (!testBatch)
                {
                    testBatch = {id: GeneralUtils.guid(), name: null, startedAt: new Date().toUTCString()};
                }

                testBatch.toString = function () {
                    return this.name + " [" + this.id + "]" + " - " + this.startedAt;
                };

                var appEnv = {
                    os: '', hostingApp: '', displaySize: this._viewportSize, inferred: ''}; // TODO: implement! + _get_inferred_environment()

                this._sessionStartInfo = {
                    agentId: EyesBase.agentId,
                    appIdOrName: this._appName,
                    scenarioIdOrName: this._testName,
                    batchInfo: testBatch,
                    environment: appEnv,
                    matchLevel: this._matchLevel,
                    branchName: null, // TODO: this._branchName,
                    parentBranchName: null // TODO: this._parentBranchName
                };

                this._serverConnector.startSession(this._sessionStartInfo).then(function (result) {
                        this._runningSession = result;
                        this._shouldMatchWindowRunOnceOnTimeout = result.isNewSession;
                        resolve();
                    }.bind(this),
                    function(err) {
                        console.error(err);
                        reject();
                    }.bind(this)
                );
            }.bind(this), function (err) {
                console.error(err);
                reject(err);
            }.bind(this));
        }.bind(this));
    };

    EyesBase.prototype.abortIfNotClosed = function () {
        return new Promise(function (resolve, rejecct) {
            if (this._isDisabled) {
                console.log("Eyes abortIfNotClosed ignored - disabled");
                resolve();
                return;
            }

            this._isOpen = false;
            this._matchWindowTask = undefined;

            if (!this._runningSession) {
                resolve();
                return;
            }

            this._serverConnector.endSession(this._runningSession, true, false).then(function () {
                this._runningSession = undefined;
                resolve();
            }.bind(this));

        }.bind(this));
    };

    EyesBase.DEFAULT_EYES_SERVER = 'https://eyessdk.applitools.com';
    EyesBase.MatchLevels = Object.freeze(_MatchLevels);
    EyesBase.FailureReports = Object.freeze(_FailureReports);

    module.exports = EyesBase;
}());
