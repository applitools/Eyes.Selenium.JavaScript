(function() {
    'use strict';

    var EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils');
    var PositionMemento = EyesSDK.PositionMemento,
        Location = EyesSDK.Location,
        ArgumentGuard = EyesUtils.ArgumentGuard;

    /**
     * @param {Location} location The current location to be saved.
     */
    function ScrollPositionMemento(location) {
        ArgumentGuard.notNull(location, "logger");
        this._position = new Location(location);
    }

    ScrollPositionMemento.prototype = new PositionMemento();
    ScrollPositionMemento.prototype.constructor = ScrollPositionMemento;

    /**
     * @returns {int}
     */
    ScrollPositionMemento.prototype.getX = function () {
        return this._position.getX();
    };

    /**
     * @returns {int}
     */
    ScrollPositionMemento.prototype.getY = function () {
        return this._position.getY();
    };

    module.exports = ScrollPositionMemento;
}());