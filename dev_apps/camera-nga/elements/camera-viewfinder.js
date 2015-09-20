(function(window) {
'use strict';

navigator.getUserMedia = navigator.getUserMedia    ||
                         navigator.mozGetUserMedia ||
                         navigator.webkitGetUserMedia;

var proto = Object.create(HTMLElement.prototype);

var template =
`<style scoped>
  #container {
    background-color: #000;
    position: relative;
    width: 100%;
    height: 100%;
  }
  #video {
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
<div id="container">
  <video id="video"></video>
</div>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container: $id('container'),
    video: $id('video')
  };

  this.els.video.addEventListener('loadedmetadata', () => {
    this.previewWidth  = this.els.video.videoWidth;
    this.previewHeight = this.els.video.videoHeight;

    this.resize();
  });

  this.onResize = () => {
    this.width  = this.offsetWidth;
    this.height = this.offsetHeight;

    this.resize();
  };

  this.stop();

  if (this.hasAttribute('autoplay')) {
    this.start();
  }
};

proto.attachedCallback = function() {
  window.addEventListener('resize', this.onResize);
  this.onResize();
};

proto.detachedCallback = function() {
  window.removeEventListener('resize', this.onResize);
  this.onResize();
};

proto.start = function() {
  return new Promise((resolve, reject) => {
    if (!navigator.mozCameras) {
      navigator.getUserMedia({ video: true }, (stream) => {
        this.els.video.src = URL.createObjectURL(stream);
        this.els.video.play();
        resolve();
      }, error => reject);
    }
  });
};

proto.stop = function() {
  return new Promise((resolve) => {
    this.previewWidth  = 0;
    this.previewHeight = 0;

    var streamURL = this.els.video.src;
    this.els.video.pause();
    this.els.video.src = '';

    URL.revokeObjectURL(streamURL);
    resolve();
  });
};

proto.resize = function() {
  var widthScale  = this.width  / this.previewWidth;
  var heightScale = this.height / this.previewHeight;

  var scale = Math.max(widthScale, heightScale);
  this.els.video.width  = this.previewWidth  * scale;
  this.els.video.height = this.previewHeight * scale;

  this.els.video.style.left = ((this.width  - this.els.video.width)  / 2) + 'px';
  this.els.video.style.top  = ((this.height - this.els.video.height) / 2) + 'px';
};

try {
  window.CameraViewfinder = document.registerElement('camera-viewfinder', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
