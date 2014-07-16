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
        PromiseFactory = require('./EyesPromiseFactory');

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
     * @param {Number} matchTimeout
     * @param {Boolean} isDisabled
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
            // TODO: use actual values:
//            this._saveNewTests = true;
//            this._saveFailedTests = false;
            this._serverConnector = new ServerConnector(this._serverUrl, EyesBase.agentId, EyesBase.apiKey);
            this._isDisabled = isDisabled;
        }
    }

    EyesBase.prototype.open = function (appName, testName, viewportSize, matchLevel, failureReports) {
        return PromiseFactory.makePromise(function (deferred) {
            console.log('EyesBase.open is running');
            if (this._isDisabled) {
                console.log("Eyes Open ignored - disabled");
                deferred.fulfill();
                return;
            }

            if (this._isOpen) {
                this.abortIfNotClosed();
                var errMsg = "A test is already running";
                console.log(errMsg);
                deferred.reject(errMsg);
                return;
            }

            this._isOpen = true;
            this._matchLevel = matchLevel || EyesBase.MatchLevels.Strict;
            this._failureReports = failureReports || EyesBase.FailureReports.OnClose;
            this._userInputs = [];
            this._viewportSize = viewportSize;
            this._testName = testName;
            this._appName = appName;
            deferred.fulfill();
        }.bind(this));
    };

    EyesBase.prototype.close = function (throwEx) {
        //TODO: try catch + exception
        return PromiseFactory.makePromise(function (deferred) {
            console.log('EyesBase.close is running');
            if (this._isDisabled) {
                console.log("Eyes Close ignored - disabled");
                deferred.fulfill();
                return;
            }

            if (!this._isOpen) {
                var errMsg = "close called with Eyes not open";
                console.log(errMsg);
                deferred.reject(errMsg);
                return;
            }

            this._isOpen = false;
            if (!this._runningSession) {
                console.log("Close: Server session was not started");
                deferred.fulfill();
                return;
            }

            console.log('EyesBase.close - calling server connector to end the running session');
            this._serverConnector.endSession(this._runningSession, false, this._runningSession.isNewSession)// TODO: calculate the flags!!
                .then(function () {
                    console.log('EyesBase.close - session ended');
                    this._runningSession = undefined;
                    deferred.fulfill();
                }.bind(this));
        }.bind(this));
    };

    EyesBase.prototype.checkWindow = function(tag, ignoreMismatch, retryTimeout, getRegionFunc) {
        retryTimeout = retryTimeout || -1;
        getRegionFunc = getRegionFunc || function () {
            return undefined;
        };

        return PromiseFactory.makePromise(function (deferred) {
            console.log('EyesBase.checkWindow - running');
            if (this._isDisabled) {
                console.log("Eyes checkWindow ignored - disabled");
                deferred.fulfill();
                return;
            }

            if (!this._isOpen)
            {
                var errMsg = "checkWindow called with Eyes not open";
                console.log(errMsg);
                deferred.reject(errMsg);
                return;
            }

            tag = tag || '';
            var region = getRegionFunc();

            this.startSession().then(function() {
                console.log('EyesBase.checkWindow - session started - creating match window task');
                this._matchWindowTask = new MatchWindowTask(this._serverConnector,
                    this._runningSession, this._matchTimeout, function (region) {
                        return PromiseFactory.makePromise(function (innerDeferred) {
                            console.log('EyesBase.checkWindow - getAppOutput callback is running - getting screenshot');
                            this.getScreenshot().then(function (uncompressed) {
                                console.log('EyesBase.checkWindow - getAppOutput received the screenshot');
                                // TODO - handle region here
                                // --->>>
                                //
                                var data = {appOutput: {}};
                                if (uncompressed) {
                                    data.screenShot = new Buffer(uncompressed, 'base64').toString('binary');
                                    data.appOutput.screenshot64 = uncompressed;
                                }

                                console.log('EyesBase.checkWindow - getAppOutput getting title');
                                this.getTitle().then(function(title) {
                                    console.log('EyesBase.checkWindow - getAppOutput received the title');
                                    data.appOutput.title = title;
                                    innerDeferred.fulfill(data);
                                }.bind(this));
                            }.bind(this));
                        }.bind(this));
                    }.bind(this), this._waitTimeout);

                console.log("EyesBase.checkWindow - calling matchWindowTask.matchWindow");
                this._matchWindowTask.matchWindow(this._userInputs, region, tag, this._shouldMatchWindowRunOnceOnTimeout,
                    ignoreMismatch, retryTimeout).then(function(result) {
                        console.log("EyesBase.checkWindow - match window returned result:", result);
                        if (!ignoreMismatch)
                        {
                            this._userInputs = [];
                        }

                        if (!result.asExpected)
                        {
                            console.log("EyesBase.checkWindow - match window result was not success");
                            this._shouldMatchWindowRunOnceOnTimeout = true;

                            if (this._failureReports === EyesBase.FailureReports.Immediate)
                            {
                                deferred.reject("Mismatch found in '" + this._sessionStartInfo.scenarioIdOrName + "' of '" +
                                    this._sessionStartInfo.appIdOrName + "'");
                            }
                        }

                        deferred.fulfill(result);
                    }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    EyesBase.prototype.startSession = function () {
        return PromiseFactory.makePromise(function (deferred) {

            if (this._runningSession) {
                deferred.fulfill();
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
                var testBatch = this._batch; //TODO: allow to set batch somewhere
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
                        deferred.fulfill();
                    }.bind(this),
                    function(err) {
                        console.error(err);
                        deferred.reject();
                    }.bind(this)
                );
            }.bind(this), function (err) {
                console.error(err);
                deferred.reject(err);
            }.bind(this));

        }.bind(this));

    };

    EyesBase.prototype.abortIfNotClosed = function () {
        return PromiseFactory.makePromise(function (deferred) {
            if (this._isDisabled) {
                console.log("Eyes abortIfNotClosed ignored - disabled");
                deferred.fulfill();
                return;
            }

            this._isOpen = false;
            this._matchWindowTask = undefined;

            if (!this._runningSession) {
                deferred.fulfill();
                return;
            }

            this._serverConnector.endSession(this._runningSession, true, false).then(function () {
                this._runningSession = undefined;
                deferred.fulfill();
            }.bind(this));
        }.bind(this));
    };

    EyesBase.DEFAULT_EYES_SERVER = 'https://eyessdk.applitools.com';
    EyesBase.MatchLevels = Object.freeze(_MatchLevels);
    EyesBase.FailureReports = Object.freeze(_FailureReports);

    module.exports = EyesBase;
}());
