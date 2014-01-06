define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var proto = Geolocation.prototype;
var geolocation = navigator.geolocation;

/**
 * Exports
 */

module.exports = Geolocation;

/**
 * Interface to the
 * geolocation API.
 *
 * @constructor
 */
function Geolocation() {
  this.watcher = null;
  this.position = null;
  this.setPosition = this.setPosition.bind(this);
  this.watch = this.watch.bind(this);
}

/**
 * Watches device location.
 *
 */
proto.watch = function() {
  if (!this.watcher) {
    this.watcher = geolocation.watchPosition(this.setPosition);
  }
};

/**
 * Stops watching
 * device location.
 *
 */
proto.stopWatching = function() {
  geolocation.clearWatch(this.watcher);
  this.watcher = null;
};

/**
 * Updates the stored
 * position object.
 *
 */
proto.setPosition = function(position) {
  this.position = {
    timestamp: position.timestamp,
    altitude: position.coords.altitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
};

});
