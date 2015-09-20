/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[ViewfinderView]', ...args) : () => {};

var ViewfinderView = View.extend(function ViewfinderView() {
  View.call(this); // super();

  this.viewfinder = document.getElementById('viewfinder');

  this.update();
});

ViewfinderView.prototype.update = function() {
  this.render();
};

ViewfinderView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

ViewfinderView.prototype.render = function() {
  View.prototype.render.call(this); // super();
};

window.view = new ViewfinderView();
