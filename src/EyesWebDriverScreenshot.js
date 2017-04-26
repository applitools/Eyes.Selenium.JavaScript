(function () {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        ScrollPositionProvider = require('./ScrollPositionProvider'),
        FrameChain = require('./FrameChain'),
        Frame = require('./Frame');
    var EyesScreenshot = EyesSDK.EyesScreenshot,
        CoordinatesType = EyesSDK.CoordinatesType,
        ArgumentGuard = EyesUtils.ArgumentGuard,
        GeneralUtils = EyesUtils.GeneralUtils,
        GeometryUtils = EyesUtils.GeometryUtils;

    /**
     * @readonly
     * @enum {number}
     */
    var ScreenshotType = {
        VIEWPORT: 1,
        ENTIRE_FRAME: 2
    };

    /**
     *
     * @param {Object} logger
     * @param {FrameChain} frameChain
     * @param {ScreenshotType} screenshotType
     * @returns {{x: number, y: number}}
     */
    var calcFrameLocationInScreenshot = function (logger, frameChain, screenshotType) {
        logger.verbose("Getting first frame..");
        var firstFrame = frameChain.getFrame(0);
        logger.verbose("Done!");
        var locationInScreenshot = GeometryUtils.createLocationFromLocation(firstFrame.getLocation());

        // We only consider scroll of the default content if this is a viewport screenshot.
        if (screenshotType == ScreenshotType.VIEWPORT) {
            var defaultContentScroll = firstFrame.getParentScrollPosition();
            locationInScreenshot = GeometryUtils.locationOffset(locationInScreenshot, defaultContentScroll);
        }

        logger.verbose("Iterating over frames..");
        var frame;
        for (var i = 1, l = frameChain.size(); i < l; ++i) {
            logger.verbose("Getting next frame...");
            frame = frameChain.getFrames()[i];
            logger.verbose("Done!");

            var frameLocation = frame.getLocation();

            // For inner frames we must consider the scroll
            var frameParentScrollPosition = frame.getParentScrollPosition();

            // Offsetting the location in the screenshot
            locationInScreenshot = GeometryUtils.locationOffset(locationInScreenshot, {
                x: frameLocation.x - frameParentScrollPosition.x,
                y: frameLocation.y - frameParentScrollPosition.y
            });
        }

        logger.verbose("Done!");
        return locationInScreenshot;
    };

    /**
     * @param {Object} logger A Logger instance.
     * @param {EyesWebDriver} driver The web driver used to get the screenshot.
     * @param {Object} image The actual screenshot image.
     * @param {Object} promiseFactory
     * @augments EyesScreenshot
     * @constructor
     */
    function EyesWebDriverScreenshot(logger, driver, image, promiseFactory) {
        EyesScreenshot.call(this, image);

        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(driver, "driver");

        this._logger = logger;
        this._driver = driver;
        this._image = image;
        this._promiseFactory = promiseFactory;
        this._frameChain = driver.getFrameChain();

        EyesScreenshot.call(this._image);
    }

    EyesWebDriverScreenshot.prototype = new EyesScreenshot();
    EyesWebDriverScreenshot.prototype.constructor = EyesWebDriverScreenshot;

    /**
     * @param {ScreenshotType} [screenshotType] The screenshot's type (e.g., viewport/full page).
     * @param {{x: number, y: number}} [frameLocationInScreenshot] The current frame's location in the screenshot.
     * @param {{width: number, height: number}} [frameSize] The full internal size of the frame.
     * @returns {Promise<void>}
     */
    EyesWebDriverScreenshot.prototype.buildScreenshot = function (screenshotType, frameLocationInScreenshot, frameSize) {
        var that = this, viewportSize, imageSize;
        var positionProvider = new ScrollPositionProvider(this._logger, this._driver, this._promiseFactory);

        return this._driver.getDefaultContentViewportSize(false).then(function (vs) {
            viewportSize = vs;
            return that._image.getSize();
        }).then(function (is) {
            imageSize = is;
            return positionProvider.getEntireSize();
        }).then(function (ppEs) {
            // If we're inside a frame, then the frame size is given by the frame
            // chain. Otherwise, it's the size of the entire page.
            if (!frameSize) {
                if (that._frameChain.size() !== 0) {
                    frameSize = that._frameChain.getCurrentFrameSize();
                } else {
                    // get entire page size might throw an exception for applications
                    // which don't support Javascript (e.g., Appium). In that case
                    // we'll use the viewport size as the frame's size.
                    if (ppEs) {
                        frameSize = ppEs;
                    } else {
                        frameSize = viewportSize;
                    }
                }
            }

            return positionProvider.getCurrentPosition();
        }).then(function (ppCp) {
            // Getting the scroll position. For native Appium apps we can't get the scroll position, so we use (0,0)
            if (ppCp) {
                that._currentFrameScrollPosition = ppCp;
            } else {
                that._currentFrameScrollPosition = GeometryUtils.createLocation(0, 0);
            }

            if (screenshotType == null) {
                if (imageSize.width <= viewportSize.width && imageSize.height <= viewportSize.height) {
                    screenshotType = ScreenshotType.VIEWPORT;
                } else {
                    screenshotType = ScreenshotType.ENTIRE_FRAME;
                }
            }
            that._screenshotType = screenshotType;

            // This is used for frame related calculations.
            if (frameLocationInScreenshot == null) {
                if (that._frameChain.size() > 0) {
                    frameLocationInScreenshot = calcFrameLocationInScreenshot(that._logger, that._frameChain, that._screenshotType);
                } else {
                    frameLocationInScreenshot = GeometryUtils.createLocation(0, 0);
                }
            }
            that._frameLocationInScreenshot = frameLocationInScreenshot;

            that._logger.verbose("Calculating frame window..");
            that._frameWindow = GeometryUtils.createRegionFromLocationAndSize(frameLocationInScreenshot, frameSize);
            GeometryUtils.intersect(that._frameWindow, GeometryUtils.createRegion(0, 0, imageSize.width, imageSize.height));
            if (that._frameWindow.width <= 0 || that._frameWindow.height <= 0) {
                throw new Error("Got empty frame window for screenshot!");
            }

            that._logger.verbose("EyesWebDriverScreenshot - Done!");
        });
    };

    /**
     * @return {{left: number, top: number, width: number, height: number}} The region of the frame which is available in the screenshot,
     * in screenshot coordinates.
     */
    EyesWebDriverScreenshot.prototype.getFrameWindow = function () {
        return this._frameWindow;
    };

    /**
     * @return {FrameChain} A copy of the frame chain which was available when the
     * screenshot was created.
     */
    EyesWebDriverScreenshot.prototype.getFrameChain = function () {
        return new FrameChain(this._logger, this._frameWindow);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Returns a part of the screenshot based on the given region.
     *
     * @param {{left: number, top: number, width: number, height: number}} region The region for which we should get the sub screenshot.
     * @param {CoordinatesType} coordinatesType How should the region be calculated on the screenshot image.
     * @param {boolean} throwIfClipped Throw an EyesException if the region is not fully contained in the screenshot.
     * @return {Promise<EyesWebDriverScreenshot>} A screenshot instance containing the given region.
     */
    EyesWebDriverScreenshot.prototype.convertLocationFromRegion = function (region, coordinatesType, throwIfClipped) {
        this._logger.verbose("getSubScreenshot(", region, ", ", coordinatesType, ", ", throwIfClipped, ")");

        ArgumentGuard.notNull(region, "region");
        ArgumentGuard.notNull(coordinatesType, "coordinatesType");

        // We calculate intersection based on as-is coordinates.
        var asIsSubScreenshotRegion = this.getIntersectedRegion(region, coordinatesType, CoordinatesType.SCREENSHOT_AS_IS);

        var sizeFromRegion = GeometryUtils.createSizeFromRegion(region);
        var sizeFromSubRegion = GeometryUtils.createSizeFromRegion(asIsSubScreenshotRegion);
        if (GeometryUtils.isRegionEmpty(asIsSubScreenshotRegion) || (throwIfClipped &&
            !(sizeFromRegion.height == sizeFromSubRegion.height && sizeFromRegion.width == sizeFromSubRegion.width))) {
            throw new Error("Region ", region, ", (", coordinatesType, ") is out of screenshot bounds ", this._frameWindow);
        }

        var subScreenshotImage = this._image.cropImage(asIsSubScreenshotRegion);

        // The frame location in the sub screenshot is the negative of the
        // context-as-is location of the region.
        var contextAsIsRegionLocation = this.convertLocationFromLocation(GeometryUtils.createLocationFromRegion(asIsSubScreenshotRegion), CoordinatesType.SCREENSHOT_AS_IS, CoordinatesType.CONTEXT_AS_IS);

        var frameLocationInSubScreenshot = GeometryUtils.createLocation(-contextAsIsRegionLocation.x, -contextAsIsRegionLocation.y);

        var that = this, result = new EyesWebDriverScreenshot(this._logger, this._driver, subScreenshotImage, this._promiseFactory);
        return result.buildScreenshot(this._screenshotType, frameLocationInSubScreenshot, null).then(function () {
            that._logger.verbose("Done!");
            return result;
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Converts a location's coordinates with the {@code from} coordinates type
     * to the {@code to} coordinates type.
     *
     * @param {{x: number, y: number}} location The location which coordinates needs to be converted.
     * @param {CoordinatesType} from The current coordinates type for {@code location}.
     * @param {CoordinatesType} to The target coordinates type for {@code location}.
     * @return {{x: number, y: number}} A new location which is the transformation of {@code location} to the {@code to} coordinates type.
     */
    EyesWebDriverScreenshot.prototype.convertLocationFromLocation = function (location, from, to) {
        ArgumentGuard.notNull(location, "location");
        ArgumentGuard.notNull(from, "from");
        ArgumentGuard.notNull(to, "to");

        var result = {x: location.x, y: location.y};

        if (from == to) {
            return result;
        }

        // If we're not inside a frame, and the screenshot is the entire
        // page, then the context as-is/relative are the same (notice
        // screenshot as-is might be different, e.g.,
        // if it is actually a sub-screenshot of a region).
        if (this._frameChain.size() == 0 && this._screenshotType == ScreenshotType.ENTIRE_FRAME) {
            if ((from == CoordinatesType.CONTEXT_RELATIVE
                || from == CoordinatesType.CONTEXT_AS_IS)
                && to == CoordinatesType.SCREENSHOT_AS_IS) {

                // If this is not a sub-screenshot, this will have no effect.
                result = GeometryUtils.locationOffset(result, this._frameLocationInScreenshot);

            } else if (from == CoordinatesType.SCREENSHOT_AS_IS &&
                (to == CoordinatesType.CONTEXT_RELATIVE || to == CoordinatesType.CONTEXT_AS_IS)) {

                result = GeometryUtils.locationOffset(result, {
                    x: -this._frameLocationInScreenshot.x,
                    y: -this._frameLocationInScreenshot.y
                });
            }
            return result;
        }

        switch (from) {
            case CoordinatesType.CONTEXT_AS_IS:
                switch (to) {
                    case CoordinatesType.CONTEXT_RELATIVE:
                        result = GeometryUtils.locationOffset(result, this._currentFrameScrollPosition);
                        break;

                    case CoordinatesType.SCREENSHOT_AS_IS:
                        result = GeometryUtils.locationOffset(result, this._frameLocationInScreenshot);
                        break;

                    default:
                        throw new Error("Cannot convert from '" + from + "' to '" + to + "'");
                }
                break;

            case CoordinatesType.CONTEXT_RELATIVE:
                switch (to) {
                    case CoordinatesType.SCREENSHOT_AS_IS:
                        // First, convert context-relative to context-as-is.
                        result = GeometryUtils.locationOffset(result, {x: -this._currentFrameScrollPosition.x, y: -this._currentFrameScrollPosition.y});
                        // Now convert context-as-is to screenshot-as-is.
                        result = GeometryUtils.locationOffset(result, this._frameLocationInScreenshot);
                        break;

                    case CoordinatesType.CONTEXT_AS_IS:
                        result = GeometryUtils.locationOffset(result, {x: -this._currentFrameScrollPosition.x, y: -this._currentFrameScrollPosition.y});
                        break;

                    default:
                        throw new Error("Cannot convert from '" + from + "' to '" + to + "'");
                }
                break;

            case CoordinatesType.SCREENSHOT_AS_IS:
                switch (to) {
                    case CoordinatesType.CONTEXT_RELATIVE:
                        // First convert to context-as-is.
                        result = GeometryUtils.locationOffset(result, {
                            x: -this._frameLocationInScreenshot.x,
                            y: -this._frameLocationInScreenshot.y
                        });
                        // Now convert to context-relative.
                        result = GeometryUtils.locationOffset(result, {x: -this._currentFrameScrollPosition.x, y: -this._currentFrameScrollPosition.y});
                        break;

                    case CoordinatesType.CONTEXT_AS_IS:
                        result = GeometryUtils.locationOffset(result, {
                            x: -this._frameLocationInScreenshot.x,
                            y: -this._frameLocationInScreenshot.y
                        });
                        break;

                    default:
                        throw new Error("Cannot convert from '" + from + "' to '" + to + "'");
                }
                break;

            default:
                throw new Error("Cannot convert from '" + from + "' to '" + to + "'");
        }
        return result;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {{x: number, y: number}} location
     * @param {CoordinatesType} coordinatesType
     * @returns {{x: number, y: number}}
     */
    EyesWebDriverScreenshot.prototype.getLocationInScreenshot = function (location, coordinatesType) {
        this._location = this.convertLocationFromLocation(location, coordinatesType, CoordinatesType.SCREENSHOT_AS_IS);

        // Making sure it's within the screenshot bounds
        if (!GeometryUtils.isRegionContainsLocation(this._frameWindow, location)) {
            throw new Error("Location " + location + " ('" + coordinatesType + "') is not visible in screenshot!");
        }
        return this._location;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {{left: number, top: number, width: number, height: number}} region
     * @param {CoordinatesType} originalCoordinatesType
     * @param {CoordinatesType} resultCoordinatesType
     * @returns {{left: number, top: number, width: number, height: number}}
     */
    EyesWebDriverScreenshot.prototype.getIntersectedRegion = function (region, originalCoordinatesType, resultCoordinatesType) {
        if (GeometryUtils.isRegionEmpty(region)) {
            return GeneralUtils.clone(region);
        }

        var intersectedRegion = this.convertRegionLocation(region, originalCoordinatesType, CoordinatesType.SCREENSHOT_AS_IS);

        switch (originalCoordinatesType) {
            // If the request was context based, we intersect with the frame
            // window.
            case CoordinatesType.CONTEXT_AS_IS:
            case CoordinatesType.CONTEXT_RELATIVE:
                GeometryUtils.intersect(intersectedRegion, this._frameWindow);
                break;

            // If the request is screenshot based, we intersect with the image
            case CoordinatesType.SCREENSHOT_AS_IS:
                GeometryUtils.intersect(intersectedRegion, GeometryUtils.createRegion(0, 0, this._image.width, this._image.height));
                break;

            default:
                throw new Error("Unknown coordinates type: '" + originalCoordinatesType + "'");
        }

        // If the intersection is empty we don't want to convert the
        // coordinates.
        if (GeometryUtils.isRegionEmpty(intersectedRegion)) {
            return intersectedRegion;
        }

        // Converting the result to the required coordinates type.
        intersectedRegion = this.convertRegionLocation(intersectedRegion, CoordinatesType.SCREENSHOT_AS_IS, resultCoordinatesType);

        return intersectedRegion;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Gets the elements region in the screenshot.
     *
     * @param {WebElement} element The element which region we want to intersect.
     * @return {Promise.<{left: number, top: number, width: number, height: number}>} The intersected region, in {@code SCREENSHOT_AS_IS} coordinates
     * type.
     */
    EyesWebDriverScreenshot.prototype.getIntersectedRegionFromElement = function (element) {
        ArgumentGuard.notNull(element, "element");

        var pl, ds;
        return element.getLocation().then(function (location) {
            pl = location;
            return element.getSize();
        }).then(function (size) {
            ds = size;

            // Since the element coordinates are in context relative
            var region = this.getIntersectedRegion(GeometryUtils.createRegionFromLocationAndSize(pl, ds), CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.CONTEXT_RELATIVE);

            if (!GeometryUtils.isRegionEmpty(region)) {
                region = this.convertRegionLocation(region, CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
            }

            return region;
        });
    };

    module.exports = EyesWebDriverScreenshot;
}());