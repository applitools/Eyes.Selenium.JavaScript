/*
 ---

 name: ServerConnector

 description: Provides an API for communication with the Applitools server.

 provides: [ServerConnector]
 requires: [GeneralUtils]

 ---
 */

;(function() {
    "use strict";

    var GeneralUtils = require('./GeneralUtils'),
        Promise = require("bluebird"),
        restler = require("restler");


    // Constants
    var CONNECTION_TIMEOUT_MS = 5 * 60 * 1000,
        DEFAULT_HEADERS = {'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Eyes JS SDK'},
        SERVER_SUFFIX = '/api/sessions/running';

    // private members
    var _serverUri,
        _httpOptions;

    /**
     *
     * Starts a new running session in the server. Based on the given parameters,
     * this running session will either be linked to an existing session, or to
     * a completely new session.
     *
     * @method _startSession
     * @param {Object} sessionStartInfo - The start parameters for the session.
     * @return {Object} Represents the current running session.
     *
     **/
    function _startSession(sessionStartInfo) {
        return new Promise(function (resolve, reject) {
            var data = GeneralUtils.toJson({startInfo: sessionStartInfo});
            console.log("Starting session: %s", data);
            restler.postJson(_serverUri, data, _httpOptions)
                .on('complete', function(data, response) {
                    console.log('start session result ', response,' status code ', data.statusCode);
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        resolve({sessionId: response['id'], sessionUrl: response['url'],
                            isNewSession: response.statusCode == 201});
                    } else {
                        reject(response);
                    }
                });
        });
    }

    function _setHttpOptions(userName, password) {
        _httpOptions = {
            username: userName,
            password: password,
            headers: DEFAULT_HEADERS,
            timeout: CONNECTION_TIMEOUT_MS
        };
    }

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUri
     * @param {String} userName - the user name (in fact - SDK-ID)
     * @param {String} password - the password (in fact - account id)
     *
     **/
    function ServerConnector(serverUri, userName, password) {
        _serverUri = GeneralUtils.urlConcat(serverUri, SERVER_SUFFIX);
        _setHttpOptions(userName, password);
    };

    ServerConnector.prototype.startSession = function (sessionStartInfo) {
        return _startSession(sessionStartInfo);
    };

    module.exports = ServerConnector;
}());
