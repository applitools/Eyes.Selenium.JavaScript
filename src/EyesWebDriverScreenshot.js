(function() {
  'use strict';

  var EyesSDK = require('eyes.sdk'),
    EyesUtils = require('eyes.utils'),
    ScrollPositionProvider = require('./ScrollPositionProvider'),
    FrameChain = require('./FrameChain'),
    Frame = require('./Frame');
  var EyesScreenshot = EyesSDK.EyesScreenshot,
    Location = EyesSDK.Location,
    Region = EyesSDK.Region,
    CoordinatesType = EyesSDK.CoordinatesType,
    ArgumentGuard = EyesUtils.ArgumentGuard;

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
   * @returns {Location}
   */
  var calcFrameLocationInScreenshot = function (logger, frameChain, screenshotType) {
    logger.verbose("Getting first frame..");
    var firstFrame = frameChain.getFrame(0);
    logger.verbose("Done!");
    var locationInScreenshot = Location.fromLocation(firstFrame.getLocation());

    // We only consider scroll of the default content if this is a viewport screenshot.
    if (screenshotType == ScreenshotType.VIEWPORT) {
      var defaultContentScroll = firstFrame.getParentScrollPosition();
      locationInScreenshot.offset([-defaultContentScroll.getX(), -defaultContentScroll.getY()]);
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
      locationInScreenshot.offset([
        frameLocation.getX() - frameParentScrollPosition.getX(),
        frameLocation.getY() - frameParentScrollPosition.getY()
      ]);

    }

    logger.verbose("Done!");
    return locationInScreenshot;
  };

  /**
   * @param {Object} logger A Logger instance.
   * @param {EyesWebDriver} driver The web driver used to get the screenshot.
   * @param {Object} image The actual screenshot image.
   */
  function EyesWebDriverScreenshot(logger, driver, image) {
    EyesScreenshot.call(this, image);

    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(driver, "driver");

    this._logger = logger;
    this._driver = driver;
    this._image = image;
    this._frameChain = driver.getFrameChain();
  }

  EyesWebDriverScreenshot.prototype = EyesScreenshot;
  EyesWebDriverScreenshot.prototype.constructor = EyesWebDriverScreenshot;

  /**
   * @param {ScreenshotType} screenshotType (Optional) The screenshot's type (e.g., viewport/full page).
   * @param {Location} frameLocationInScreenshot (Optional) The current frame's location in the screenshot.
   * @param {RectangleSize} frameSize The full internal size of the frame.
   * @returns {!promise.Promise<void>}
   */
  EyesWebDriverScreenshot.prototype.buildScreenshot = function (screenshotType, frameLocationInScreenshot, frameSize) {
    var that = this, viewportSize, imageSize;
    var positionProvider = new ScrollPositionProvider(this._logger, this._driver);

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
        if (that._frameChain.size() != 0) {
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
        that._scrollPosition = ppCp;
      } else {
        that._scrollPosition = new Location(0, 0);
      }

      if (screenshotType == null) {
        if (imageSize.width <= viewportSize.getWidth() && imageSize.height <= viewportSize.getHeight()) {
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
          frameLocationInScreenshot = new Location(0, 0);
          if (that._screenshotType == ScreenshotType.VIEWPORT) {
            frameLocationInScreenshot.offset([-that._scrollPosition.getX(), -that._scrollPosition.getY()]);
          }
        }
      }
      that._frameLocationInScreenshot = frameLocationInScreenshot;

      that._logger.verbose("Calculating frame window..");
      that._frameWindow = Region.fromLocation(frameLocationInScreenshot, frameSize);
      that._frameWindow.intersect(new Region(0, 0, imageSize.width, imageSize.height));
      if (that._frameWindow.getWidth() <= 0 || that._frameWindow.getHeight() <= 0) {
        throw new Error("Got empty frame window for screenshot!");
      }

      that._logger.verbose("EyesWebDriverScreenshot - Done!");
    });
  };

  /**
   * @return {Region} The region of the frame which is available in the screenshot,
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

  /**
   * Returns a part of the screenshot based on the given region.
   *
   * @param {Region} region The region for which we should get the sub screenshot.
   * @param {CoordinatesType} coordinatesType How should the region be calculated on the
   * screenshot image.
   * @param {boolean} throwIfClipped Throw an EyesException if the region is not
   * fully contained in the screenshot.
   * @return {!promise.Promise<EyesWebDriverScreenshot>} A screenshot instance containing the given region.
   */
  EyesWebDriverScreenshot.prototype.convertLocationFromRegion = function (region, coordinatesType, throwIfClipped) {
    this._logger.verbose("getSubScreenshot([" + region + "], " + coordinatesType + ", " + throwIfClipped + ")");

    ArgumentGuard.notNull(region, "region");
    ArgumentGuard.notNull(coordinatesType, "coordinatesType");

    // We calculate intersection based on as-is coordinates.
    var asIsSubScreenshotRegion = this.getIntersectedRegion(region, coordinatesType, CoordinatesType.SCREENSHOT_AS_IS);

    if (asIsSubScreenshotRegion.isEmpty() ||
      (throwIfClipped && !asIsSubScreenshotRegion.getSize().equals(region.getSize()))) {
      throw new Error("Region [" + region + ", (" + coordinatesType + ")] is out of screenshot bounds [" + this._frameWindow + "]");
    }

    var subScreenshotImage = this._image.cropImage({
      left: asIsSubScreenshotRegion.getLeft(),
      top: asIsSubScreenshotRegion.getTop(),
      width: asIsSubScreenshotRegion.getWidth(),
      height: asIsSubScreenshotRegion.getHeight()
    });

    // The frame location in the sub screenshot is the negative of the
    // context-as-is location of the region.
    var contextAsIsRegionLocation = this.convertLocationFromLocation(asIsSubScreenshotRegion.getLocation(), CoordinatesType.SCREENSHOT_AS_IS, CoordinatesType.CONTEXT_AS_IS);

    var frameLocationInSubScreenshot = new Location(-contextAsIsRegionLocation.getX(), -contextAsIsRegionLocation.getY());

    var that = this, result = new EyesWebDriverScreenshot(this._logger, this._driver, subScreenshotImage);
    return result.buildScreenshot(this._screenshotType, frameLocationInSubScreenshot, null).then(function () {
        that._logger.verbose("Done!");
        return result;
    });
  };

  /**
   * Converts a location's coordinates with the {@code from} coordinates type
   * to the {@code to} coordinates type.
   *
   * @param {Location} location The location which coordinates needs to be converted.
   * @param {CoordinatesType} from The current coordinates type for {@code location}.
   * @param {CoordinatesType} to The target coordinates type for {@code location}.
   * @return {Location} A new location which is the transformation of {@code location} to
   * the {@code to} coordinates type.
   */
  EyesWebDriverScreenshot.prototype.convertLocationFromLocation = function (location, from, to) {
    ArgumentGuard.notNull(location, "location");
    ArgumentGuard.notNull(from, "from");
    ArgumentGuard.notNull(to, "to");

    var result = Location.fromLocation(location);

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
        result.offset([this._frameLocationInScreenshot.getX(), this._frameLocationInScreenshot.getY()]);

      } else if (from == CoordinatesType.SCREENSHOT_AS_IS &&
        (to == CoordinatesType.CONTEXT_RELATIVE || to == CoordinatesType.CONTEXT_AS_IS)){

        result.offset([-this._frameLocationInScreenshot.getX(), -this._frameLocationInScreenshot.getY()]);
      }
      return result;
    }

    switch (from) {
      case CoordinatesType.CONTEXT_AS_IS:
        switch (to) {
          case CoordinatesType.CONTEXT_RELATIVE:
            result.offset([this._scrollPosition.getX(), this._scrollPosition.getY()]);
            break;

          case CoordinatesType.SCREENSHOT_AS_IS:
            result.offset([this._frameLocationInScreenshot.getX(), this._frameLocationInScreenshot.getY()]);
            break;

          default:
            throw new Error("Cannot convert from '" + from + "' to '" + to + "'");
        }
        break;

      case CoordinatesType.CONTEXT_RELATIVE:
        switch (to) {
          case CoordinatesType.SCREENSHOT_AS_IS:
            // First, convert context-relative to context-as-is.
            result.offset([-this._scrollPosition.getX(), -this._scrollPosition.getY()]);
            // Now convert context-as-is to screenshot-as-is.
            result.offset([this._frameLocationInScreenshot.getX(), this._frameLocationInScreenshot.getY()]);
            break;

          case CoordinatesType.CONTEXT_AS_IS:
            result.offset([-this._scrollPosition.getX(), -this._scrollPosition.getY()]);
            break;

          default:
            throw new Error("Cannot convert from '" + from + "' to '" + to + "'");
        }
        break;

      case CoordinatesType.SCREENSHOT_AS_IS:
        switch (to) {
          case CoordinatesType.CONTEXT_RELATIVE:
            // First convert to context-as-is.
            result.offset([-this._frameLocationInScreenshot.getX(), -this._frameLocationInScreenshot.getY()]);
            // Now convert to context-relative.
            result.offset([this._scrollPosition.getX(), this._scrollPosition.getY()]);
            break;

          case CoordinatesType.CONTEXT_AS_IS:
            result.offset([-this._frameLocationInScreenshot.getX(), -this._frameLocationInScreenshot.getY()]);
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

  /**
  * @param {Location} location
  * @param {CoordinatesType} coordinatesType
  * @returns {Location}
  */
  EyesWebDriverScreenshot.prototype.getLocationInScreenshot = function (location, coordinatesType) {
    this._location = this.convertLocationFromLocation(location, coordinatesType, CoordinatesType.SCREENSHOT_AS_IS);

    // Making sure it's within the screenshot bounds
    if (!this._frameWindow.contains(location)) {
      throw new Error("Location " + location + " ('" + coordinatesType + "') is not visible in screenshot!");
    }
    return this._location;
  };

  /**
   *
   * @param {Region} region
   * @param {CoordinatesType} originalCoordinatesType
   * @param {CoordinatesType} resultCoordinatesType
   * @returns {Region}
   */
  EyesWebDriverScreenshot.prototype.getIntersectedRegion = function (region, originalCoordinatesType, resultCoordinatesType) {
    if (region.isEmpty()) {
      return new Region(region);
    }

    var intersectedRegion = this.convertRegionLocation(region, originalCoordinatesType, CoordinatesType.SCREENSHOT_AS_IS);

    switch (originalCoordinatesType) {
      // If the request was context based, we intersect with the frame
      // window.
      case CoordinatesType.CONTEXT_AS_IS:
      case CoordinatesType.CONTEXT_RELATIVE:
        intersectedRegion.intersect(this._frameWindow);
        break;

      // If the request is screenshot based, we intersect with the image
      case CoordinatesType.SCREENSHOT_AS_IS:
        // TODO: image format!!!
        intersectedRegion.intersect(new Region(0, 0, this._image.getWidth(), this._image.getHeight()));
        break;

      default:
        throw new Error("Unknown coordinates type: '" + originalCoordinatesType + "'");
    }

    // If the intersection is empty we don't want to convert the
    // coordinates.
    if(intersectedRegion.isEmpty()) {
      return intersectedRegion;
    }

    // Converting the result to the required coordinates type.
    intersectedRegion = this.convertRegionLocation(intersectedRegion, CoordinatesType.SCREENSHOT_AS_IS, resultCoordinatesType);

    return intersectedRegion;
  };

  /**
   * Gets the elements region in the screenshot.
   *
   * @param {WebElement} element The element which region we want to intersect.
   * @return {Region} The intersected region, in {@code SCREENSHOT_AS_IS} coordinates
   * type.
   */
  EyesWebDriverScreenshot.prototype.getIntersectedRegionFromElement = function (element) {
    ArgumentGuard.notNull(element, "element");

    var pl = element.getLocation();
    var ds = element.getSize();

    var region = new Region(pl.x, pl.y, ds.width, ds.height);

    // Since the element coordinates are in context relative
    region = this.getIntersectedRegion(region, CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.CONTEXT_RELATIVE);

    if (!region.isEmpty()) {
      region = this.convertRegionLocation(region, CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
    }

    return region;
  };

  module.exports = EyesWebDriverScreenshot;
}());