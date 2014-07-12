/*
 ---

 name: ViewportSize

 description: helper method to acquire viewport dimensions.

 provides: [ViewportSize]

 ---
 */

;(function() {
    "use strict";

    var Promise = require('bluebird'),
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
        return new Promise(function (resolve) {
            try {
                driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_NORMAL_BROWSER).then(function(size) {
                        if (size.width > 0 && size.height > 0) {
                            resolve(size);
                            return;
                        }

                        driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS).then(function(size) {
                            resolve(size);
                        });
                    },
                    function(err){
                        console.log('Failed to get viewport size - attempting bad browser script', err);
                        driver.executeScript(_GET_VIEWPORT_SIZE_JAVASCRIPT_FOR_BAD_BROWSERS).then(function(size) {
                            resolve(size);
                        });
                    });
            } catch (err) {
                console.log('Failed to get viewport size - using window size', err);
                new Window(driver).getSize().then(function(size){
                    resolve(size);
                });
            }
        });
    };

    // TODO: Implement setViewPortSize
    ViewportSize.setViewportSize = function (driver, size) {
        throw "TODO: Implement setViewPortSize";
    };

    module.exports = ViewportSize;
}());