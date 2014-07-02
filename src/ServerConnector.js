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
        Promise = require("bluebird");

    // Constants
    var CONNECTION_TIMEOUT_SECONDS = 5 * 60,
        DEFAULT_HEADERS = {'Accept': 'application/json', 'Content-Type': 'application/json'},
        SERVER_SUFFIX = '/api/sessions/running';

    // private members
    var _serverUri,
        _restClient;

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
        var data = GeneralUtils.toJson({startInfo: sessionStartInfo});
        console.log("Starting session: %s", data);

        /*
         data = '{"startInfo": %s}' % (general_utils.to_json(session_start_info))
         logger.debug("Starting session: %s " % data)
         response = requests.post(self._endpoint_uri, data=data, auth=self._auth, verify=False,
         headers=AgentConnector._DEFAULT_HEADERS,
         timeout=AgentConnector._TIMEOUT)
         parsed_response = _parse_response_with_json_data(response)
         return dict(session_id=parsed_response['id'], session_url=parsed_response['url'],
         is_new_session=(response.status_code == requests.codes.created))
         */

        return '';
    }

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUri
     * @param {Object} restClient - an initialized restClient
     *
     **/
    var ServerConnector = function (serverUri, restClient) {
        _serverUri = GeneralUtils.urlConcat(serverUri, SERVER_SUFFIX);
        _restClient = restClient;
    };

    ServerConnector.prototype.startSession = function (sessionStartInfo) {
        return _startSession(sessionStartInfo);
    };

    module.exports = ServerConnector;
}());
