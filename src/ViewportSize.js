/*
 ---

 name: ViewportSize

 description: helper method to acquire viewport dimensions.

 provides: [ViewportSize]

 ---
 */

;(function() {
    "use strict";

    var EyesSDK = require('eyes.sdk');
    var PromiseFactory = EyesSDK.EyesPromiseFactory,
        webdriver = require('selenium-webdriver');
    var Window = webdriver.WebDriver.Window;

    // consts
    var _GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER =
            'return {width: window.innerWidth, height: window.innerHeight}',
        _GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS =
            'return {width: document.documentElement.clientWidth, height: document.documentElement.clientHeight}';

    var ViewportSize = {};

    /**
     *
     * Tries to get the viewport size using Javascript. If fails, gets the entire browser window size!
     *
     * @method getViewportSize
     * @param {Object} driver
     *
     * @return {Object} the size
     *
     **/
    ViewportSize.getViewportSize = function (driver) {
        console.log('ViewportSize.getViewportSize called');
        return PromiseFactory.makePromise(function (deferred) {
            try {
                console.log('ViewportSize.getViewportSize - executing scripts');
                driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER).then(function(size) {
                        if (size.width > 0 && size.height > 0) {
                            console.log('ViewportSize.getViewportSize - normal script returned size: w', size.width,
                            ' h', size.height);
                            deferred.fulfill(size);
                            return;
                        }

                        console.log('ViewportSize.getViewportSize - normal script returned bad size - calling old script');

                        driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS).then(function(size) {
                            console.log('ViewportSize.getViewportSize - old script returned size: w', size.width,
                                ' h', size.height);
                            deferred.fulfill(size);
                        });
                    },
                    function(err){
                        console.log('ViewportSize.getViewportSize - error while getting viewport size - ' +
                            'attempting old browser script', err);
                        driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS).then(function(size) {
                            console.log('ViewportSize.getViewportSize - old script returned size: w', size.width,
                                ' h', size.height);
                            deferred.fulfill(size);
                        });
                    });
            } catch (err) {
                console.log('ViewportSize.getViewportSize - exception - so using window size', err);
                new Window(driver).getSize().then(function(size){
                    console.log('ViewportSize.getViewportSize - window returned size: w', size.width,
                        ' h', size.height);
                    deferred.fulfill(size);
                });
            }
        }.bind(this));
    };

    // TODO: Implement setViewPortSize
    ViewportSize.setViewportSize = function (driver, size) {
        console.log('ViewportSize.setViewportSize - not implemented');
        throw "TODO: Implement setViewPortSize";
    };

    module.exports = ViewportSize;
}());