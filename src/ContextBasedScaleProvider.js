(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils');
    var ScaleProvider = EyesSDK.ScaleProvider,
        ArgumentGuard = EyesUtils.ArgumentGuard,
        ImageUtils = EyesUtils.ImageUtils;

    var ALLOWED_VS_DEVIATION = 1,
        ALLOWED_DCES_DEVIATION = 10,
        UNKNOWN_SCALE_RATIO = 0;

    /**
     * @param {Object} logger A Logger instance.
     * @param {EyesWebDriver} executor
     */
    /**
     *
     * @param {RectangleSize} topLevelContextEntireSize The total size of the top level
     * context. E.g., for selenium this would be the document size of the top level frame.
     * @param {RectangleSize} viewportSize The viewport size.
     * @param {Number} devicePixelRatio The device pixel ratio of the platform on which the application is running.
     * @param {PromiseFactory} promiseFactory
     */
    function ContextBasedScaleProvider(topLevelContextEntireSize, viewportSize, devicePixelRatio, promiseFactory) {
        this._topLevelContextEntireSize = topLevelContextEntireSize;
        this._viewportSize = viewportSize;
        this._devicePixelRatio = devicePixelRatio;
        this._promiseFactory = promiseFactory;

        // Since we need the image size to decide what the scale ratio is.
        this._scaleRatio = UNKNOWN_SCALE_RATIO;
    }

    ContextBasedScaleProvider.prototype = new ScaleProvider();
    ContextBasedScaleProvider.prototype.constructor = ContextBasedScaleProvider;

    /**
     * @returns {Number}
     */
    ContextBasedScaleProvider.prototype.getScaleRatio = function () {
        ArgumentGuard.isValidState(this._scaleRatio != UNKNOWN_SCALE_RATIO, "scaleRatio not defined yet");
        return this._scaleRatio;
    };

    /**
     * @param {object} image
     * @returns {!promise.Promise<object>}
     */
    ContextBasedScaleProvider.prototype.scaleImage = function (image) {
        // First time an image is given we determine the scale ratio.
        if (this._scaleRatio == UNKNOWN_SCALE_RATIO) {

            var imageWidth = image.getWidth(),
                viewportWidth = this._viewportSize.getWidth(),
                dcesWidth = this._topLevelContextEntireSize.getWidth();

            // If the image's width is the same as the viewport's width or the
            // top level context's width, no scaling is necessary.
            if (((imageWidth >= viewportWidth - ALLOWED_VS_DEVIATION)
                && (imageWidth <= viewportWidth + ALLOWED_VS_DEVIATION))
                || ((imageWidth >= dcesWidth - ALLOWED_DCES_DEVIATION)
                && imageWidth <= dcesWidth + ALLOWED_DCES_DEVIATION)) {
                this._scaleRatio = 1;
            } else {
                this._scaleRatio = 1 / this._devicePixelRatio;
            }
        }

        return ImageUtils.scaleImage(image, this._scaleRatio, this._promiseFactory);
    };

    /**
     * @param {int} imageWidth
     * @returns {!promise.Promise<object>}
     */
    ContextBasedScaleProvider.prototype.calculateScale = function (imageWidth) {
        // First time an image is given we determine the scale ratio.
        if (this._scaleRatio == UNKNOWN_SCALE_RATIO) {

            var viewportWidth = this._viewportSize.width,
                dcesWidth = this._topLevelContextEntireSize.width;

            // If the image's width is the same as the viewport's width or the
            // top level context's width, no scaling is necessary.
            if (((imageWidth >= viewportWidth - ALLOWED_VS_DEVIATION)
                && (imageWidth <= viewportWidth + ALLOWED_VS_DEVIATION))
                || ((imageWidth >= dcesWidth - ALLOWED_DCES_DEVIATION)
                && imageWidth <= dcesWidth + ALLOWED_DCES_DEVIATION)) {
                this._scaleRatio = 1;
            } else {
                this._scaleRatio = 1 / this._devicePixelRatio;
            }
        }

        return this._scaleRatio;
    };

    module.exports = ContextBasedScaleProvider;
}());