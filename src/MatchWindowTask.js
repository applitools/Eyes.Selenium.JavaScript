/*
 ---

 name: MatchWindowTask

 description: Handles matching of output with the expected output (including retry and 'ignore mismatch'
 when needed).

 provides: [MatchWindowTask]

 ---
 */

;(function() {
    "use strict";

    var PromiseFactory = require('./EyesPromiseFactory');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} serverConnector
     * @param {Object} runningSession
     * @param {Number} retryTimeout
     * @param {Object} appOutputProvider
     * @param {Function} waitTimeout - a call back that provides timeout
     *
     **/
    function MatchWindowTask(serverConnector, runningSession, retryTimeout, appOutputProvider, waitTimeout) {
        console.log('MatchWindowTask initialized');
        this._serverConnector = serverConnector;
        this._runningSession = runningSession;
        this._defaultRetryTimeout = retryTimeout;
        this._getAppOutput = appOutputProvider;
        this._matchResult = undefined;
        this._lastScreenshot = undefined;
        this._waitTimeout = waitTimeout;
    }

    // TODO: use
//    MatchWindowTask.prototype.getLastScreenshotBounds = function () {
//        return this._lastBounds;
//    };

    MatchWindowTask.prototype.matchWindow = function (userInputs, region, tag,
                                                      shouldRunOnceOnRetryTimeout, ignoreMismatch, retryTimeout) {

        console.log("MatchWindowTask.matchWindow called with shouldRunOnceOnRetryTimeout: ",
            shouldRunOnceOnRetryTimeout, ", ignoreMismatch: ", ignoreMismatch, ", retryTimeout: ", retryTimeout);

        if (retryTimeout < 0)
        {
            retryTimeout = this._defaultRetryTimeout;
        }

        return PromiseFactory.makePromise(function (deferred) {
            console.log('MatchWindowTask.matchWindow starting to perform the match process');
            if (shouldRunOnceOnRetryTimeout || (retryTimeout == 0)) {
                if (retryTimeout > 0)
                {
                    console.log('MatchWindowTask.matchWindow - running once but after going into timeout');
                    this._waitTimeout(retryTimeout).then(function () {
                        console.log('MatchWindowTask.matchWindow - back from timeout - calling match');
                        _match.call(this, region, tag, ignoreMismatch, userInputs, deferred);
                    }.bind(this));
                } else {
                    console.log('MatchWindowTask.matchWindow - running once immediately');
                    _match.call(this, region, tag, ignoreMismatch, userInputs, deferred);
                }
            } else {
                // Retry matching and ignore mismatches while the retry timeout does not expires.
                var start = new Date().getTime();
                console.log('MatchWindowTask.matchWindow - starting retry sequence. start:', start);
                _retryMatch.call(this, start, retryTimeout, region, tag, userInputs, ignoreMismatch, undefined, deferred);
            }

        }.bind(this));
    };

    function _match(region, tag, ignoreMismatch, userInputs, deferred) {
        console.log('MatchWindowTask.matchWindow - _match calls for app output');
        this._getAppOutput(region).then(function (appOutput) {
            console.log('MatchWindowTask.matchWindow - _match retrieved app output');
            var data = {
                userInputs: userInputs,
                appOutput: appOutput.appOutput,
                tag: tag,
                ignoreMismatch: ignoreMismatch};
            this._serverConnector.matchWindow(this._runningSession, data).then(function (matchResult) {
                console.log('MatchWindowTask.matchWindow - _match received server connector result:', matchResult);
                this._matchResult = matchResult;
                _finalize.call(this, region, ignoreMismatch, appOutput.screenshot, deferred);
            }.bind(this));
        }.bind(this));
    }

    function _retryMatch(start, retryTimeout, region, tag, userInputs, ignoreMismatch, screenshot, deferred) {

        if ((new Date().getTime() - start) < retryTimeout) {
            console.log('MatchWindowTask.matchWindow - _retryMatch will retry. time:', new Date().getTime().toString());
            console.log('MatchWindowTask.matchWindow - _retryMatch calls for app output');
            this._getAppOutput(region).then(function (appOutput) {
                console.log('MatchWindowTask.matchWindow - _retryMatch retrieved app output');
                screenshot = appOutput.screenshot;
                var data = {
                    userInputs: userInputs,
                    appOutput: appOutput.appOutput,
                    tag: tag,
                    ignoreMismatch: true};
                this._serverConnector.matchWindow(this._runningSession, data).then(function (result) {
                    console.log('MatchWindowTask.matchWindow - _retryMatch received server connector result:', result);
                    this._matchResult = result;

                    if (!this._matchResult.asExpected)
                    {
                        console.log('MatchWindowTask.matchWindow - _retryMatch received failed result - timeout and retry');
                        this._waitTimeout(500).then(function () {
                            console.log('MatchWindowTask.matchWindow - _retryMatch timeout passed -  retrying');
                            _retryMatch.call(this, start, retryTimeout, region, tag, userInputs, ignoreMismatch,
                                screenshot, deferred);
                        }.bind(this));
                    } else {
                        console.log('MatchWindowTask.matchWindow - _retryMatch received success result - finalizing');
                        _finalize.call(this, region, ignoreMismatch, screenshot, deferred);
                    }
                }.bind(this));
            }.bind(this));
        } else {
            console.log('MatchWindowTask.matchWindow - _retryMatch exhausted the retry interval. time: ',
                new Date().getTime().toString());
            if (!this._matchResult.asExpected) {
                // Try one last time...
                console.log('MatchWindowTask.matchWindow - _retryMatch last attempt because we got failure');
                _match.call(this, region, tag, ignoreMismatch, userInputs, deferred);
            } else {
                console.log('MatchWindowTask.matchWindow - _retryMatch no need for last attempt because we got success');
                _finalize.call(this, region, ignoreMismatch, screenshot, deferred);
            }
        }
    }


    function _finalize(region, ignoreMismatch, screenshot, deferred) {
        console.log('MatchWindowTask.matchWindow - _finalize called');
        if (ignoreMismatch)
        {
            console.log('MatchWindowTask.matchWindow - _finalize is completed because ignoreMismatch is true');
            deferred.fulfill(this._matchResult);
            return;
        }

        this._lastScreenshot = screenshot;

        if (!region)
        {
            if (!this._lastScreenshot)
            {
                console.log('MatchWindowTask.matchWindow - _finalize sets infinite bounds - no region and no screenshot');
                // We set an "infinite" image size since we don't know what the screenshot
                // size is...
                    this._lastBounds = {
                    top: 0,
                    left: 0,
                    width: 1000000000,
                    height: 1000000000
                };
            }
            else
            {
                console.log('MatchWindowTask.matchWindow - _finalize sets bounds - according to screenshot');

                this._lastBounds = {
                    top: 0,
                    left: 0,
                    width: this._lastScreenshot.width,
                    height: this._lastScreenshot.height
                };
            }
        }
        else
        {
            console.log('MatchWindowTask.matchWindow - _finalize sets bounds - according to region');
            this._lastBounds = region;
        }

        deferred.fulfill(this._matchResult);
    }

    module.exports = MatchWindowTask;
}());
