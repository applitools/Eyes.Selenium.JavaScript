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

    var Promise = require('bluebird');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} serverConnector
     * @param {Object} runningSession
     * @param {Number} retryTimeout
     * @param {Object} appOutputProvider
     *
     **/
    function MatchWindowTask(serverConnector, runningSession, retryTimeout, appOutputProvider) {
        this._serverConnector = serverConnector;
        this._runningSession = runningSession;
        this._defaultRetryTimeout = retryTimeout;
        this._getAppOutput = appOutputProvider;
        this._matchResult = undefined;
        this._lastScreenshot = undefined;
    }

    MatchWindowTask.prototype.getLastScreenshotBounds = function () {
        return this._lastBounds;
    };

    MatchWindowTask.prototype.matchWindow = function (userInputs, region, tag,
                                                      shouldRunOnceOnRetryTimeout, ignoreMismatch, retryTimeout) {

        if (retryTimeout < 0)
        {
            retryTimeout = this._defaultRetryTimeout;
        }

        return new Promise(function (resolve, reject) {


            if (shouldRunOnceOnRetryTimeout || (retryTimeout == 0)) {

                if (retryTimeout > 0)
                {
                    setTimeout(function () {
                        _match.call(this, region, tag, ignoreMismatch, userInputs, resolve, reject);
                    }.bind(this), retryTimeout);
                } else {
                    _match.call(this, region, tag, ignoreMismatch, userInputs, resolve, reject);
                }
            } else {
                // Retry matching and ignore mismatches while the retry timeout does not expires.
                var start = new Date().getTime();

                _retryMatch.call(this, start, retryTimeout, region, tag, userInputs, ignoreMismatch, undefined, resolve, reject);
            }
        }.bind(this));
    };

    function _match(region, tag, ignoreMismatch, userInputs, resolve, reject) {
        this._getAppOutput(region).then(function (appOutput) {
            var data = {
                userInputs: userInputs,
                appOutput: appOutput.appOutput,
                tag: tag,
                ignoreMismatch: ignoreMismatch};
            this._serverConnector.matchWindow(this._runningSession, data).then(function (matchResult) {
                this._matchResult = matchResult;
                _finalize.call(this, region, ignoreMismatch, appOutput.screenshot, resolve, reject);
            }.bind(this));
        }.bind(this));
    }

    function _retryMatch(start, retryTimeout, region, tag, userInputs, ignoreMismatch, screenshot, resolve, reject) {

        if ((new Date().getTime() - start) < retryTimeout) {

            this._getAppOutput(region).then(function (appOutput) {
                screenshot = appOutput.screenshot;
                var data = {
                    userInputs: userInputs,
                    appOutput: appOutput.appOutput,
                    tag: tag,
                    ignoreMismatch: true};
                this._serverConnector.matchWindow(this._runningSession, data).then(function (result) {
                    this._matchResult = result;

                    if (!this._matchResult.asExpected)
                    {
                        setTimeout(function () {
                            _retryMatch.call(this, start, retryTimeout, region, tag, userInputs, ignoreMismatch,
                                screenshot, resolve, reject);
                        }.bind(this), 500);
                    } else {
                        _finalize.call(this, region, ignoreMismatch, screenshot, resolve, reject);
                    }
                }.bind(this));
            }.bind(this));
        } else {
            if (!this._matchResult.asExpected) {
                // Try one last time...
                _match.call(this, region, tag, ignoreMismatch, userInputs, resolve, reject);
            } else {
                _finalize.call(this, region, ignoreMismatch, screenshot, resolve, reject);
            }
        }
    }


    function _finalize(region, ignoreMismatch, screenshot, resolve, reject) {
        if (ignoreMismatch)
        {
            resolve(this._matchResult);
            return;
        }

        // Server will register the failed image so we keep it as the last screenshot
        // to compress against.
        if (this._lastScreenshot)
        {
            this._lastScreenshot = undefined;
        }

        if (screenshot)
        {
            this._lastScreenshot = screenshot;
        }

        if (!region)
        {
            if (!this._lastScreenshot)
            {
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
            this._lastBounds = region;
        }

        resolve(this._matchResult);
    }

    module.exports = MatchWindowTask;
}());
