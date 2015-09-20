(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var template =
`camera-view-stack {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  -moz-user-select: none;
}
camera-view-stack > iframe {
  border: none;
  visibility: hidden;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}
camera-view-stack > iframe.active,
camera-view-stack > iframe.fade,
camera-view-stack > iframe.pop,
camera-view-stack > iframe.push {
  animation-duration: 0.2s;
  animation-timing-function: linear;
  visibility: visible;
}
camera-view-stack > iframe.active {
  pointer-events: auto;
}
camera-view-stack > iframe.fade {
  animation-duration: 0s;
}
camera-view-stack > iframe.fade.in {
  animation-name: fade-in;
}
camera-view-stack > iframe.fade.out {
  animation-name: fade-out;
}
camera-view-stack > iframe.pop.in {
  animation-name: pop-in;
}
camera-view-stack > iframe.pop.out {
  animation-name: pop-out;
}
camera-view-stack > iframe.push.in {
  animation-name: push-in;
}
camera-view-stack > iframe.push.out {
  animation-name: push-out;
}
@keyframes fade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes fade-out {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes pop-in {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
@keyframes pop-out {
  0%   { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
@keyframes push-in {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(0); }
}
@keyframes push-out {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}`;

proto.createdCallback = function() {
  var style = document.createElement('style');
  style.innerHTML = template;

  if (this.firstChild) {
    this.insertBefore(style, this.firstChild);
  } else {
    this.appendChild(style);
  }

  this.cachedViews = {};

  [].forEach.call(this.querySelectorAll('iframe'), (frame) => {
    var location = new URL(frame.src);

    var view = {
      url: location.pathname + location.search,
      frame: frame,
      title: frame.contentDocument.title
    };

    this.initializeView(view).then((view) => {
      if (this.activeView === view) {
        this.dispatchEvent(new CustomEvent('titlechange', {
          detail: view.title
        }));
      }
    });

    this.cachedViews[view.url] = view;
  });

  this.addEventListener('animationend', (evt) => {
    var classList = evt.target.classList;
    if (classList.contains('destroy')) {
      this.destroyView(evt.target.src);
    }

    classList.remove('fade', 'pop', 'push', 'in', 'out');
  });

  this.views = [];
  this.activeView = null;
};

proto.loadView = function(url) {
  var view = this.cachedViews[url];
  if (view) {
    return Promise.resolve(view);
  }

  return new Promise((resolve) => {
    var frame = document.createElement('iframe');
    var view = {
      url: url,
      frame: frame,
      title: ''
    };

    this.initializeView(view).then(resolve);

    this.appendChild(frame);
    frame.src = url;
  });
};

proto.initializeView = function(view) {
  return new Promise((resolve) => {
    view.frame.addEventListener('load', () => {
      this.cachedViews[view.url] = view;

      view.title = view.frame.contentDocument.title;

      resolve(view);
    });

    view.frame.addEventListener('rendered', () => {
      this.dispatchEvent(new CustomEvent('rendered'));
    });

    view.frame.addEventListener('titlechange', (evt) => {
      view.title = evt.detail;

      if (this.activeView === view) {
        this.dispatchEvent(new CustomEvent('titlechange', {
          detail: evt.detail
        }));
      }
    });
  });
};

proto.destroyView = function(url) {
  for (var key in this.cachedViews) {
    var view = this.cachedViews[key];
    if (key === url || view.frame.src === url) {
      view.frame.contentWindow.dispatchEvent(new CustomEvent('viewdestroy'));
      delete this.cachedViews[key];

      setTimeout(() => this.removeChild(view.frame), 5000);
      return;
    }
  }
};

proto.setRootView = function(url) {
  return this.loadView(url).then((view) => {
    requestAnimationFrame(() => {
      var oldActiveView = this.activeView;
      if (oldActiveView) {
        oldActiveView.frame.classList.add('fade', 'out');
        oldActiveView.frame.classList.remove('active');
        oldActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));
      }

      this.views = [view];
      this.activeView = view;

      var newActiveView = this.activeView;
      newActiveView.frame.classList.add('fade', 'in');
      newActiveView.frame.classList.add('active');
      newActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));

      this.dispatchEvent(new CustomEvent('change', { detail: newActiveView }));
    });
  });
};

proto.pushView = function(url) {
  if (!this.activeView) {
    return this.setRootView(url);
  }

  return this.loadView(url).then((view) => {
    requestAnimationFrame(() => {
      var oldActiveView = this.activeView;
      oldActiveView.frame.classList.add('push', 'out');
      oldActiveView.frame.classList.remove('active');
      oldActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));

      this.views.push(view);
      this.activeView = view;

      var newActiveView = this.activeView;
      newActiveView.frame.classList.add('push', 'in', 'active');
      newActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));

      this.dispatchEvent(new CustomEvent('change', { detail: newActiveView }));
    });
  });
};

proto.popView = function(destroy) {
  if (this.views.length < 2) {
    return Promise.reject();
  }

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      var oldActiveView = this.activeView;
      oldActiveView.frame.classList.add('pop', 'out');
      oldActiveView.frame.classList.remove('active');
      oldActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));

      if (destroy) {
        oldActiveView.frame.classList.add('destroy');
      }

      this.views.pop();
      this.activeView = this.views[this.views.length - 1];

      var newActiveView = this.activeView;
      newActiveView.frame.classList.add('pop', 'in', 'active');
      newActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));

      this.dispatchEvent(new CustomEvent('change', { detail: newActiveView }));

      resolve();
    });
  });
};

try {
  window.CameraViewStack = document.registerElement('camera-view-stack', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
