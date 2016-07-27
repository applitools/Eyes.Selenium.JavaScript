(function () {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        ScrollPositionMemento = require('./ScrollPositionMemento');
    var RectangleSize = EyesSDK.RectangleSize,
        Location = EyesSDK.Location;

    /**
     * @constructor
     */
    function EyesSeleniumUtils() {
    }

    /**
     * @type {string}
     */
    EyesSeleniumUtils.JS_GET_VIEWPORT_SIZE =
        "var height = undefined;"
        + "var width = undefined;"
        + "  if (window.innerHeight) {height = window.innerHeight;}"
        + "  else if (document.documentElement "
        + "&& document.documentElement.clientHeight) "
        + "{height = document.documentElement.clientHeight;}"
        + "  else { var b = document.getElementsByTagName('body')[0]; "
        + "if (b.clientHeight) {height = b.clientHeight;}"
        + "};"
        + " if (window.innerWidth) {width = window.innerWidth;}"
        + " else if (document.documentElement "
        + "&& document.documentElement.clientWidth) "
        + "{width = document.documentElement.clientWidth;}"
        + " else { var b = document.getElementsByTagName('body')[0]; "
        + "if (b.clientWidth) {"
        + "width = b.clientWidth;}"
        + "};"
        + "return [width, height];";

    /**
     * @type {string}
     */
    EyesSeleniumUtils.JS_GET_CURRENT_SCROLL_POSITION =
        "var doc = document.documentElement; " +
        "var x = window.scrollX || " +
        "((window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0));"
        + " var y = window.scrollY || " +
        "((window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0));" +
        "return [x, y];";

    /**
     * @type {string}
     */
    EyesSeleniumUtils.JS_GET_CONTENT_ENTIRE_SIZE =
        "var scrollWidth = document.documentElement.scrollWidth; " +
        "var bodyScrollWidth = document.body.scrollWidth; " +
        "var totalWidth = Math.max(scrollWidth, bodyScrollWidth); " +
        "var clientHeight = document.documentElement.clientHeight; " +
        "var bodyClientHeight = document.body.clientHeight; " +
        "var scrollHeight = document.documentElement.scrollHeight; " +
        "var bodyScrollHeight = document.body.scrollHeight; " +
        "var maxDocElementHeight = Math.max(clientHeight, scrollHeight); " +
        "var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight); "
        + "var totalHeight = Math.max(maxDocElementHeight, maxBodyHeight); "
        + "return [totalWidth, totalHeight];";

    /**
     * @type {string[]}
     */
    EyesSeleniumUtils.JS_TRANSFORM_KEYS = ["transform", "-webkit-transform"];

    /**
     * Sets the overflow of the current context's document element.
     * @param {WebDriver} executor The executor to use for setting the overflow.
     * @param {string} value The overflow value to set.
     * @return {!promise.Promise<string>} The previous overflow value (could be {@code null} if undefined).
     */
    EyesSeleniumUtils.setOverflow = function (executor, value) {
        var script;
        if (value == null) {
            script =
                "var origOverflow = document.documentElement.style.overflow; " +
                "document.documentElement.style.overflow = undefined; " +
                "return origOverflow";
        } else {
            script =
                "var origOverflow = document.documentElement.style.overflow; " +
                "document.documentElement.style.overflow = \"" + value + "\"; " +
                "return origOverflow";
        }
        return executor.executeScript(script);
    };

    /**
     * Hides the scrollbars of the current context's document element.
     *
     * @param {WebDriver} executor The executor to use for hiding the scrollbars.
     * @param {int} stabilizationTimeout The amount of time to wait for the "hide
     *                             scrollbars" action to take effect
     *                             (Milliseconds). Zero/negative values are
     *                             ignored.
     * @return {!promise.Promise<Location>} The previous value of the overflow property (could be
     *          {@code null}).
     */
    EyesSeleniumUtils.hideScrollbars = function (executor, stabilizationTimeout) {
        return this.setOverflow(executor, "hidden").timeout(stabilizationTimeout);
    };

    /**
     *
     * @param {WebDriver} executor The executor to use.
     * @return {!promise.Promise<Location>} The current scroll position of the current frame.
     */
    EyesSeleniumUtils.getCurrentScrollPosition = function (executor) {
        return executor.executeScript(this.JS_GET_CURRENT_SCROLL_POSITION).then(function (position) {
            return new Location(position[0], position[1]);
        });
    };

    /**
     * Sets the scroll position of the current frame.
     * @param {WebDriver} executor The executor to use.
     * @param {Location} location The position to be set.
     * @returns {!promise.Promise<void>}
     */
    EyesSeleniumUtils.setCurrentScrollPosition = function (executor, location) {
        return executor.executeScript("window.scrollTo(" + location.getX() + "," + location.getY() + ")");
    };

    /**
     *
     * @param {WebDriver} executor The executor to use.
     * @return {!promise.Promise<RectangleSize>} The size of the entire content.
     */
    EyesSeleniumUtils.getCurrentFrameContentEntireSize = function (executor) {
        return executor.executeScript(this.JS_GET_CONTENT_ENTIRE_SIZE).then(function (es) {
            return new RectangleSize(es[0], es[1]);
        });
    };

    /**
     *
     * @param {WebDriver} executor The executor to use.
     * @return {!promise.Promise<RectangleSize>} The viewport size.
     */
    EyesSeleniumUtils.executeViewportSizeExtraction = function (executor) {
        return executor.executeScript(this.JS_GET_VIEWPORT_SIZE).then(function (vs) {
            return new RectangleSize(vs[0], vs[1]);
        });
    };

    /**
     * @param {Logger} logger The logger to use.
     * @param {WebDriver} driver The web driver to use.
     * @param {Eyes} eyes The web driver to use.
     * @param {PromiseFactory} promiseFactory
     * @return {!promise.Promise<RectangleSize>} The viewport size of the current context.
     */
    EyesSeleniumUtils.extractViewportSize = function (logger, driver, eyes, promiseFactory) {
        var that = this;
        return promiseFactory.makePromise(function (resolve) {
            logger.verbose("extractViewportSize()");
            try {
                that.executeViewportSizeExtraction(driver).then(function (viewportSize) {
                    resolve(viewportSize);
                });

            } catch (err) {
                logger.verbose("Failed to extract viewport size using Javascript: " + err);

                // If we failed to extract the viewport size using JS, will use the window size instead.
                logger.verbose("Using window size as viewport size.");
                var windowSize = driver.manage().window().getSize();
                var width = windowSize.width;
                var height = windowSize.height;
                try {
                    //EyesSeleniumUtils.isLandscapeOrientation(driver)
                    if (eyes._isLandscape && height > width) {
                        var height2 = width;
                        width = height;
                        height = height2;
                    }
                } catch (err) {
                    // Not every WebDriver supports querying for orientation.
                }

                logger.verbose("Done! Size " + width + " x %d" + height);
                resolve(new RectangleSize(width, height));
            }
        });
    };

    /**
     * @param {WebDriver} executor The executor to use.
     * @return {!promise.Promise<Number>} The device pixel ratio.
     */
    EyesSeleniumUtils.getDevicePixelRatio = function (executor) {
        return executor.executeScript("return window.devicePixelRatio").then(function (ratio) {
            return parseFloat(ratio);
        });
    };

    /**
     *
     * @param {WebDriver} executor The executor to use.
     * @return {!promise.Promise<object>} The current documentElement transform values, according to
     * {@link #JS_TRANSFORM_KEYS}.
     */
    EyesSeleniumUtils.getCurrentTransform = function (executor) {
        var script = "return { ";

        for (var key in this.JS_TRANSFORM_KEYS) {
            script += "'" + key + "': document.documentElement.style['" + key + "'],";
        }

        // Ending the list
        script += " }";

        return executor.executeScript(script);
    };

    /**
     * Sets transforms for document.documentElement according to the given
     * map of style keys and values.
     *
     * @param {WebDriver} executor The executor to use.
     * @param {object} transforms The transforms to set. Keys are used as style keys,
     *                   and values are the values for those styles.
     * @returns {!promise.Promise<void>}
     */
    EyesSeleniumUtils.setTransforms = function (executor, transforms) {
        var script = "";
        for (var key in transforms) {
            var value = transforms[key];
            script += "document.documentElement.style['" + key + "'] = '" + value + "';";
        }

        return executor.executeScript(script);
    };

    /**
     * Set the given transform to document.documentElement for all style keys
     * defined in {@link #JS_TRANSFORM_KEYS} .
     *
     * @param {WebDriver} executor The executor to use.
     * @param {object} transform The transform value to set.
     * @returns {!promise.Promise<void>}
     */
    EyesSeleniumUtils.setTransform = function (executor, transform) {
        var transforms = {};

        for (var key in this.JS_TRANSFORM_KEYS) {
            transforms[key] = transform;
        }

        return this.setTransforms(executor, transforms);
    };

    /**
     * Translates the current documentElement to the given position.
     * @param {WebDriver} executor The executor to use.
     * @param {Location} position The position to translate to.
     * @returns {!promise.Promise<void>}
     */
    EyesSeleniumUtils.translateTo = function (executor, position) {
        return this.setTransform(executor, "translate(-" + position.getX() + "px, -" + position.getY() + "px)");
    };

    module.exports = EyesSeleniumUtils;
}());