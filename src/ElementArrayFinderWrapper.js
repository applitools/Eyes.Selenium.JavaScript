/*
 ---

 name: ElementArrayFinderWrapper

 description: Wraps Protractor's ElementArrayFinder to make sure we return our own Web Element.

 ---
 */

(function () {
    "use strict";

    var EyesUtils = require('eyes.utils'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        ElementFinderWrapper = require('./ElementFinderWrapper');
    var GeneralUtils = EyesUtils.GeneralUtils;

    // function in ElementArrayFinder that return a new ElementFinder and therefore we must wrap and return our own
    var ELEMENT_ARRAY_FINDER_TO_ELEMENT_FINDER_FUNCTIONS = ['get', 'first', 'last'];

    /**
     * Wrapper for ElementArrayFinder object from Protractor
     *
     * @param {ElementArrayFinder} arrayFinder
     * @param {EyesWebDriver} eyesDriver
     * @param {Logger} logger
     * @constructor
     **/
    function ElementArrayFinderWrapper(arrayFinder, eyesDriver, logger) {
        GeneralUtils.mixin(this, arrayFinder);

        this._logger = logger;
        this._eyesDriver = eyesDriver;
        this._arrayFinder = arrayFinder;

        var that = this;
        // Wrap the functions that return objects that require pre-wrapping
        ELEMENT_ARRAY_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementFinderWrapper(that._arrayFinder[fnName].apply(that._arrayFinder, arguments), that._eyesDriver, that._logger);
            };
        });

        // Patch this internal function.
        var originalFn = that._arrayFinder.asElementFinders_;
        that._arrayFinder.asElementFinders_ = function () {
            return originalFn.apply(that._arrayFinder).then(function (arr) {
                var list = [];
                arr.forEach(function (finder) {
                    list.push(new ElementFinderWrapper(finder, that._eyesDriver, that._logger));
                });
                return list;
            });
        }
    }

    /**
     * Wrap the getWebElements function
     *
     * @returns {EyesRemoteWebElement[]}
     */
    ElementArrayFinderWrapper.prototype.getWebElements = function () {
        var that = this;
        that._logger.verbose("ElementArrayFinderWrapper:getWebElements - called");
        var res = [];
        that._arrayFinder.getWebElements.apply(that._arrayFinder).forEach(function (el) {
            res.push(new EyesRemoteWebElement(el, that._eyesDriver, that._logger));
        });
        return res;
    };

    exports.ElementArrayFinderWrapper = ElementArrayFinderWrapper;
}());
