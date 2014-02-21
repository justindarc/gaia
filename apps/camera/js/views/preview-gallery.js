define(function(require) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:preview-gallery');
var bind = require('lib/bind');

var View = require('vendor/view');
var Preview = require('lib/preview');

/**
 * Locals
 */

return View.extend({
  name: 'preview-gallery',

  initialize: function() {
    this.render();
    bind(this.el, 'click', this.toggle);
    debug('rendered');
  },

  render: function() {
    this.el.innerHTML = this.template();
  },

  template: function() {
    return '<div class="preview-gallery-inner">' +
      '</div>';
  },

  open: function() {
    this.el.classList.add('active');
  },

  close: function() {
    this.el.classList.remove('active');
  },

  toggle: function() {
    if (this.el.classList.contains('active')) {
      this.close();
    }

    else {
      this.open();
    }
  },

  addImage: function(path, blob) {
    var preview = new Preview(Preview.PREVIEW_TYPE.IMAGE, path, blob);
    
    preview.process().then(function(preview) {
      console.log('****PreviewGalleryView****\n\n');
      console.log(preview);

      // TODO: Replace filmstrip.js `addItem()` here
    }, function(error) {
      console.log('****PreviewGalleryView****\n\n');
      console.log(error);
    });
  },

  addVideo: function(path, blob, posterPath, posterBlob) {
    var preview = new Preview(Preview.PREVIEW_TYPE.VIDEO, path, blob,
                              posterPath, posterBlob);

    preview.process().then(function(preview) {
      console.log('****PreviewGalleryView****\n\n');
      console.log(preview);

      // TODO: Replace filmstrip.js `addItem()` here
    }, function(error) {
      console.log('****PreviewGalleryView****\n\n');
      console.log(error);
    });
  }
});

});
