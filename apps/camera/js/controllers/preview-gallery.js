define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:preview-gallery');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new PreviewGalleryController(app);
};

function PreviewGalleryController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.previewView = app.views.preview;
  this.bindEvents();
  debug('initialized');
}

PreviewGalleryController.prototype.bindEvents = function() {
  // this.app.on('change:recording', this.onRecordingChange);
  // this.app.on('camera:timeupdate', this.recordingTimerView.setValue);
  debug('events bound');
};

});
