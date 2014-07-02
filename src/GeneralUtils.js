/*
 ---

 name: GeneralUtils

 description: collection of utility methods.

 provides: [GeneralUtils]

 ---
 */

;(function() {
    "use strict";

    var GeneralUtils = {};

    /**
     *
     * concatenate the url to the suffix - making sure there are no double slashes
     *
     * @method _urlConcat
     * @param {String} url - The left side of the URL.
     * @param {String} suffix - the right side.
     *
     * @return {String} the URL
     *
     **/
    function _urlConcat(url, suffix) {
        var left = url;
        if (url.lastIndexOf("/") == (url.length - 1)) {
            left = url.slice(0, url.length - 1);
        }

        if (suffix.indexOf("/") == 0) {
            return left + suffix;
        }

        return left + "/" + suffix;
    }

    function _toJson(o) {
        return JSON.stringify(o);
    }

    GeneralUtils.urlConcat = function (url, suffix) {
        return _urlConcat(url, suffix);
    };

    GeneralUtils.toJson = function (o) {
        return _toJson(o);
    };

    module.exports = GeneralUtils;
}());