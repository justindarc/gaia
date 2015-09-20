/* global SERVICE_WORKERS, bridge */
'use strict';

function perfMark(marker) {
  window.performance.mark(marker);
  perfMark[marker] = Date.now();
}

perfMark.get = (marker) => {
  var start = window.performance.timing.fetchStart; // domLoading?
  return perfMark[marker] - start;
};

perfMark.log = () => Object.keys(perfMark).forEach((marker) => {
  if (typeof perfMark[marker] !== 'function') {
    console.log('[Performance] ' + marker + ': ' + perfMark.get(marker) + 'ms');
  }
});

// PERFORMANCE MARKER (1): navigationLoaded
// Designates that the app's *core* chrome or navigation interface
// exists in the DOM and is marked as ready to be displayed.
perfMark('navigationLoaded');

const VIEWS = {
  VIEWFINDER: { URL: '/views/viewfinder/index.html' }
};

var $id = document.getElementById.bind(document);

var activity = null;

if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', activity => onActivity(activity));
}

var client = bridge.client({
  service: 'camera-service',
  endpoint: window,
  timeout: false
});

client.connect();

updateOverlays();

var viewStack     = $id('view-stack');
var noCardOverlay = $id('no-card-overlay');

viewStack.addEventListener('change', (evt) => {
  var viewUrl = evt.detail.url;

  document.body.dataset.activeViewUrl = viewUrl;
});

viewStack.addEventListener('rendered', onVisuallyLoaded);

noCardOverlay.addEventListener('cancel', () => cancelActivity());

if (SERVICE_WORKERS) {
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration && registration.active) {
      console.log('ServiceWorker already registered');
      boot();
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(() => {
        console.log('ServiceWorker registered successfully');
        window.location.reload();
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed', error);
      });
  });
}

else {
  boot();
}

function navigateToURL(url, replaceRoot) {
  var path = url.substring(1);
  var parts = path.split('?');

  var viewUrl = '/views/' + parts.shift() + '/index.html';

  if (replaceRoot) {
    viewStack.setRootView(viewUrl);
  }

  else {
    viewStack.pushView(viewUrl);
  }

  if (!SERVICE_WORKERS) {
    url = '#' + url;
  }

  window.history.pushState(null, null, url);
}

function updateOverlays() {

}

function cancelActivity() {
  switch (activity && activity.source.name) {
    case 'pick':
      activity.postError('pick cancelled');
      break;
  }
}

function onActivity(activity) {
  window.activity = activity;
}

function onVisuallyLoaded() {
  this.removeEventListener('rendered', onVisuallyLoaded);

  // PERFORMANCE MARKER (3): visuallyLoaded
  // Designates that the app is visually loaded (e.g.: all of the
  // "above-the-fold" content exists in the DOM and is marked as
  // ready to be displayed).
  perfMark('visuallyLoaded');

  // PERFORMANCE MARKER (4): contentInteractive
  // Designates that the app has its events bound for the minimum
  // set of functionality to allow the user to interact with the
  // "above-the-fold" content.
  perfMark('contentInteractive');

  // PERFORMANCE MARKER (5): fullyLoaded
  // Designates that the app is *completely* loaded and all relevant
  // "below-the-fold" content exists in the DOM, is marked visible,
  // has its events bound and is ready for user interaction. All
  // required startup background processing should be complete.
  perfMark('fullyLoaded');
  perfMark.log();
}

function boot() {
  var url = SERVICE_WORKERS ?
    window.location.href.substring(window.location.origin.length) :
    window.location.hash.substring(1) || '/'

  if (url === '/' || url === '/index.html') {
    url = '/viewfinder';
  }

  navigateToURL(url, true);

  // PERFORMANCE MARKER (2): navigationInteractive
  // Designates that the app's *core* chrome or navigation interface
  // has its events bound and is ready for user interaction.
  perfMark('navigationInteractive');
}
