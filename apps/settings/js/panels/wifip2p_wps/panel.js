define(function(require) {
  'use strict';

  var _ = navigator.mozL10n.get;
  var SettingsPanel = require('modules/settings_panel');
  var wifiP2pContext = require('modules/wifip2p_context');

  return function ctor_wpsWifiP2p() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements.panel = panel;
      },
      onBeforeHide: function() {
        // Store information on the context to make them accessible from
        // other panels.
        wifiP2pContext.wpsOptions.selectedMethod = elements.panel.querySelector(
          'input[type=\'radio\']:checked').value;
      },
    });
  };
});
