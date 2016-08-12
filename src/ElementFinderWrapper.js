/*
 ---

 name: ElementFinderWrapper

 description: Wraps Protractor's ElementFinder to make sure we return our own Web Element.

 ---
 */

(function () {
    "use strict";

    var EyesUtils = require('eyes.utils'),
        EyesRemoteWebElement = require('./EyesRemoteWebElement'),
        ElementArrayFinderWrapper = require('./ElementArrayFinderWrapper');
    var GeneralUtils = EyesUtils.GeneralUtils;

    // functions in ElementFinder that return a new ElementFinder and therefore we must wrap and return our own
    var ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS = ['element', '$', 'evaluate', 'allowAnimations'];
    // functions in ElementFinder that return a new ElementArrayFinder and therefore we must wrap and return our own
    var ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS = ['all', '$$'];

    /**
     * Wrapper for ElementFinder object from Protractor
     *
     * @param {ElementFinder} finder
     * @param {Eyes} eyes
     * @param {Logger} logger
     * @constructor
     **/
    function ElementFinderWrapper(finder, eyes, logger) {
        GeneralUtils.mixin(this, finder);

        this._logger = logger;
        this._eyes = eyes;
        this._finder = finder;

        var that = this;
        ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementFinderWrapper(that._finder[fnName].apply(that._finder, arguments), that._eyes, that._logger);
            };
        });

        ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementArrayFinderWrapper(that._finder[fnName].apply(that._finder, arguments), that._eyes, that._logger);
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
        return new EyesRemoteWebElement(this._finder.getWebElement.apply(this._finder), this._eyes, this._logger);
    };

    /**
     * Wrap the click function
     *
     * @returns {Promise.<EyesRemoteWebElement>}
     */
    ElementFinderWrapper.prototype.click = function () {
        var that = this;
        that._logger.verbose("ElementFinderWrapper:click - called");
        return that._finder.getWebElement().then(function (element) {
            return EyesRemoteWebElement.registerClick(element, that._eyes, that._logger);
        }).then(function () {
            return new EyesRemoteWebElement(that._finder.click.apply(that._finder), that._eyes, that._logger);
        });
    };

    /**
     * Wrap the functions that return objects that require pre-wrapping
     *
     * @returns {Promise.<EyesRemoteWebElement>}
     */
    ElementFinderWrapper.prototype.sendKeys = function () {
        var that = this, args = Array.prototype.slice.call(arguments, 0);
        that._logger.verbose("ElementFinderWrapper:sendKeys - called");
        return that._finder.getWebElement().then(function (element) {
            return EyesRemoteWebElement.registerSendKeys(element, that._eyes, that._logger, args);
        }).then(function () {
            return new EyesRemoteWebElement(that._finder.sendKeys.apply(that._finder, args), that._eyes, that._logger);
        });
    };

    exports.ElementFinderWrapper = ElementFinderWrapper;
}());
