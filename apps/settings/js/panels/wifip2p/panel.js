define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var SettingsPanel = require('modules/settings_panel');
  var WifiWps = require('panels/wifi/wifi_wps');
  var WifiContext = require('modules/wifi_context');
  var WifiHelper = require('shared/wifi_helper');

  var _ = navigator.mozL10n.get;
  var localize = navigator.mozL10n.localize;

  var gWifiP2pManager = navigator.mozWifiP2pManager;

  var gWpsMethod = "pbc";
  var gGoIntent = 1;
  var DEVICE_NAME = "I am Mozillian!";

  return function ctor_wifip2p() {
    var elements;

    function debug(msg) {
      dump('----------- Wifi Direct Settings: ' + msg);
    }

    var panel = SettingsPanel({
      onInit: function(panel) {
        if (!gWifiP2pManager) {
          debug("WifiP2pManager doesn't exist!");
          return;
        }

        elements = {
          panel: panel,
          wifi: panel,
          toggleCheckbox: panel.querySelector('#wifip2p-enabled input'),
          goIntentBlock: panel.querySelector('#p2p-go-intent-column small'),
          goIntentColumn: panel.querySelector('#p2p-go-intent-column'),
          wpsColumn: panel.querySelector('#p2p-wps-column'),
          wpsInfoBlock: panel.querySelector('#p2p-wps-column small'),
          peerList: panel.querySelector('#wifiP2pPeerList'),
          wpsDialog: panel.querySelector('#wifip2p-wps'),
        };

        // element related events
        elements.toggleEnabledCheckbox.addEventListener('change', onToggleEnabled);
        elements.goIntentColumn.addEventListener('click', onGoIntentColumnClick);
        elements.wpsColumn.addEventListener('click', onWpsColumnClick);

        // MozWifiP2pManager events.
        gWifiP2pManager.addEventListener('statuschange', onStatusChange);
        gWifiP2pManager.addEventListener('enabled', onEnabled);
        gWifiP2pManager.addEventListener('disabled', onDisabled);
        gWifiP2pManager.addEventListener('peerinfoupdate', onPeerInfoUpdate);

        //
        // Initial actions.
        //
        updateGoIntent();
        updateWpsMethod();
        setPairingRequestHandler();
        gWifiP2pManager.setScanEnabled(true);
      },
    });

    //
    // DOM handlers
    //
    function onToggleEnabled(event) {
      gWifiP2pManager.setScanEnabled(true);
    }

    function onGoIntentColumnClick(event) {
      var goIntent = parseInt(prompt("GO Intent"), 10);
      if (isNaN(goIntent) || goIntent < 0 || goIntent > 15) {
        debug('Invalid go intent');
        return;
      }
      gGoIntent = goIntent;
      updateGoIntent();
    }

    function onWpsColumnClick(event) {
      SettingsUtils.openDialog('wifip2p-wps', {
        onSubmit: function() {
          var dialog = elements.wpsDialog;
          var checked = dialog.querySelector("input[type='radio']:checked").value;
          gWpsMethod = checked;
          updateWpsMethod();
        },
      });
    }

    //
    // MozWifiP2pManager event handlers.
    //
    function onEnabled(event) {
      debug("WifiP2pManager.onenabled()");
      gWifiP2pPeerList.clear();
      gWifiP2pManager.setScanEnabled(true);
    }

    function onDisabled(event) {
      debug("WifiP2pManager.onenabled()");
      gWifiP2pPeerList.clear();
    }

    function onStatusChange(event) {
      debug("WifiP2pManager.onstatuschange()");

      if (gWifiP2pManager.groupOwner) {
        debug("Current Group owner: macAddress: " + gWifiP2pManager.groupOwner.macAddress +
              ", ipAddress: " + gWifiP2pManager.groupOwner.ipAddress +
              ", isLocal: " + gWifiP2pManager.groupOwner.isLocal);
      }

      debug('The peer whose status has just changed is: ' + event.peerAddress);

      var req = gWifiP2pManager.getPeerList();
      req.onsuccess = function (event) {
        var peerList = event.target.result;
        debug("onGetPeerListSuccess(), peerList = " + JSON.stringify(peerList));
        gWifiP2pPeerList.setPeerList(peerList);
      };
    }

    function onPeerInfoUpdate(event) {
      debug("WifiP2pManager.onpeerinfoupdate()");
      var req = gWifiP2pManager.getPeerList();
      req.onsuccess = function (event) {
        var peerList = event.target.result;
        debug("onGetPeerListSuccess(), peerList = " + JSON.stringify(peerList));
        gWifiP2pPeerList.setPeerList(peerList);
      };
    }

    //
    // Helpers.
    //
    function updateGoIntent() {
      elements.goIntentBlock.textContent = gGoIntent;
    }

    function updateWpsMethod() {
      elements.wpsInfoBlock.textContent = gWpsMethod;
    }

    function setPairingRequestHandler() {
      navigator.mozSetMessageHandler('wifip2p-pairing-request', function(evt) {
        var accepted = true;

        function setPairingConfirm(aAccepted, aPin) {
          gWifiP2pManager.setPairingConfirmation(aAccepted, aPin);
        }

        switch (evt.wpsMethod) {
          case "pbc":
            accepted = confirm("Connect with " + evt.name + "?");
            setPairingConfirm(accepted, "");
            break;
          case "display":
            alert("PIN: " + evt.pin);
            setPairingConfirm(true, evt.pin); // !!! Confirm before alert() to avoid bugs
            break;
          case "keypad":
            var pin = prompt("PIN");
            if (pin) {
              debug('Pin was entered: ' + pin);
            } else {
              accepted = false;
            }
            setPairingConfirm(accepted, pin);
            break;
          default:
            debug('Unknown wps method: ' + evt.wpsMethod);
            break;
        }
      });
    }

    return panel;
  };


});
