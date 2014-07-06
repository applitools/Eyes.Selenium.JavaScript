/*
 ---

 name: ScreenshotTaker

 ---
 */

;(function() {
    "use strict";

    var GeneralUtils = require('./GeneralUtils');

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} driverServerUri
     * @param {String} driverSessionId
     *
     *
     **/
    function ScreenshotTaker(driverServerUri, driverSessionId) {
        var cnct = GeneralUtils.urlConcat;
        this._driverServerUri = cnct(cnct(cnct(driverServerUri, "session"), driverSessionId), "screenshot");
    }

    ScreenshotTaker.prototype.getScreenshotAsBase64 = function() {

    };

    module.exports = ScreenshotTaker;
}());
