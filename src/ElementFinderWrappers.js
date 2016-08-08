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
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} finder
     * @param {Eyes} eyes
     * @param {Logger} logger
     **/
    function ElementFinderWrapper(finder, eyes, logger) {
        GeneralUtils.mixin(this, finder);

        // Wrap the getWebElement function
        this.getWebElement = function () {
            logger.verbose("ElementFinderWrapper:getWebElement - called");
            return new EyesRemoteWebElement(finder.getWebElement.apply(finder), eyes, logger);
        };

        // Wrap the click function
        this.click = function () {
            logger.verbose("ElementFinderWrapper:click - called");
            return finder.getWebElement()
                .then(function (element) {
                    return EyesRemoteWebElement.registerClick(element, eyes, logger);
                })
                .then(function () {
                    return new EyesRemoteWebElement(finder.click.apply(finder), eyes, logger);
                });
        };

        // Wrap the sendKeys function
        this.sendKeys = function () {
            var args = Array.prototype.slice.call(arguments, 0);
            logger.verbose("ElementFinderWrapper:sendKeys - called");
            return finder.getWebElement()
                .then(function (element) {
                    return EyesRemoteWebElement.registerSendKeys(element, eyes, logger, args);
                })
                .then(function () {
                    return new EyesRemoteWebElement(finder.sendKeys.apply(finder, args), eyes, logger);
                });
        };

        // Wrap the functions that return objects that require pre-wrapping
        var that = this;
        ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementFinderWrapper(finder[fnName].apply(finder, arguments), eyes, logger);
            };
        });

        ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementArrayFinderWrapper(finder[fnName].apply(finder, arguments), eyes, logger);
            };
        });
    }

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {Object} arrayFinder
     * @param {Eyes} eyes
     * @param {Logger} logger
     **/
    function ElementArrayFinderWrapper(arrayFinder, eyes, logger) {
        GeneralUtils.mixin(this, arrayFinder);

        // Wrap the getWebElements function
        this.getWebElements = function () {
            logger.verbose("ElementArrayFinderWrapper:getWebElements - called");
            var res = [];
            arrayFinder.getWebElements.apply(arrayFinder).forEach(function (el) {
                res.push(new EyesRemoteWebElement(el, eyes, logger));
            });
            return res;
        };

        // Wrap the functions that return objects that require pre-wrapping
        var that = this;
        ELEMENT_ARRAY_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
            that[fnName] = function () {
                return new ElementFinderWrapper(arrayFinder[fnName].apply(arrayFinder, arguments), eyes, logger);
            };
        });

        // Patch this internal function.
        var originalFn = arrayFinder.asElementFinders_;
        arrayFinder.asElementFinders_ = function () {
            return originalFn.apply(arrayFinder).then(function (arr) {
                var list = [];
                arr.forEach(function (finder) {
                    list.push(new ElementFinderWrapper(finder, eyes, logger));
                });
                return list;
            });
        }
    }

    exports.ElementFinderWrapper = ElementFinderWrapper;
    exports.ElementArrayFinderWrapper = ElementArrayFinderWrapper;
}());
