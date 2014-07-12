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

    function _extend(destination, source, skip) {
        for (var k in source) {
            if (skip.indexOf(k) < 0) {
                destination[k] = source[k];
            }
        }
        return destination;
    }

    GeneralUtils.urlConcat = function (url, suffix) {
        return _urlConcat(url, suffix);
    };

    GeneralUtils.toJson = function (o) {
        return _toJson(o);
    };

    GeneralUtils.extend = function (destination, source, skip) {
        return _extend(destination, source, skip || []);
    };

    GeneralUtils.guid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0;
            var v = (c == 'x') ? r : (r & 0x3|0x8);
            return v.toString(16);
        });
    };

    module.exports = GeneralUtils;
}());