/*
 ---

 name: ElementFinderWrapper

 description: Wraps Protractor's ElementFinder to make sure we return our own Web Element.

 ---
 */

(function () {
    "use strict";

    var EyesUtils = require('eyes.utils'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement');
    var GeneralUtils = EyesUtils.GeneralUtils;

    // functions in ElementFinder that return a new ElementFinder and therefore we must wrap and return our own
    var ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS = ['element', '$', 'evaluate', 'allowAnimations'];
    // functions in ElementFinder that return a new ElementArrayFinder and therefore we must wrap and return our own
    var ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS = ['all', '$$'];
    // function in ElementArrayFinder that return a new ElementFinder and therefore we must wrap and return our own
    var ELEMENT_ARRAY_FINDER_TO_ELEMENT_FINDER_FUNCTIONS = ['get', 'first', 'last'];

    /**
     * Wrapper for ElementFinder object from Protractor
     *
     * @param {ElementFinder} finder
     * @param {EyesWebDriver} eyesDriver
     * @param {Logger} logger
     * @constructor
     **/
    function ElementFinderWrapper(finder, eyesDriver, logger) {
        GeneralUtils.mixin(this, finder);

        this._logger = logger;
        this._eyesDriver = eyesDriver;
        this._finder = finder;

        var that = this;
        ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementFinderWrapper(that._finder[fnName].apply(that._finder, arguments), that._eyesDriver, that._logger);
            };
        });

        ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementArrayFinderWrapper(that._finder[fnName].apply(that._finder, arguments), that._eyesDriver, that._logger);
            };
        });
    }

    /**
     * Wrap the getWebElement function
     *
     * @returns {EyesRemoteWebElement}
     */
    ElementFinderWrapper.prototype.getWebElement = function () {
        this._logger.verbose("ElementFinderWrapper:getWebElement - called");
        return new EyesRemoteWebElement(this._finder.getWebElement.apply(this._finder), this._eyesDriver, this._logger);
    };

    /**
     * Wrap the click function
     *
     * @returns {Promise.<EyesRemoteWebElement>}
     */
    ElementFinderWrapper.prototype.click = function () {
        this._logger.verbose("ElementFinderWrapper:click - called");
        var element = this.getWebElement();
        return element.click.apply(element);
    };

    /**
     * Wrap the functions that return objects that require pre-wrapping
     *
     * @returns {Promise.<EyesRemoteWebElement>}
     */
    ElementFinderWrapper.prototype.sendKeys = function () {
        this._logger.verbose("ElementFinderWrapper:sendKeys - called");
        var element = this.getWebElement();
        return element.sendKeys.apply(element, arguments);
    };

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
     * @returns {Promise.<EyesRemoteWebElement[]>}
     */
    ElementArrayFinderWrapper.prototype.getWebElements = function () {
        var that = this;
        that._logger.verbose("ElementArrayFinderWrapper:getWebElements - called");
        return that._arrayFinder.getWebElements.apply(that._arrayFinder).then(function (elements) {
            var res = [];
            elements.forEach(function (el) {
                res.push(new EyesRemoteWebElement(el, that._eyesDriver, that._logger));
            });
            return res;
        });
    };

    module.exports.ElementFinderWrapper = ElementFinderWrapper;
    module.exports.ElementArrayFinderWrapper = ElementArrayFinderWrapper;
}());
