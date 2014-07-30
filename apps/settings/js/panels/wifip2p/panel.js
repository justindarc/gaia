define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var SettingsPanel = require('modules/settings_panel');

  var _ = navigator.mozL10n.get;
  var localize = navigator.mozL10n.localize;

  var gWifiP2pManager = navigator.mozWifiP2pManager;
  var gWifiP2pPeerList;

  var gWpsMethod = "pbc";
  var gGoIntent = 1;
  var DEVICE_NAME = "I am Mozillian!";

  if (!gWifiP2pManager) {
    var nop = function() {};
    gWifiP2pManager = {
      addEventListener: nop,
      setScanEnabled: nop,
      connect: nop,
      disconnect: nop,
      getPeerList: nop,
      setPairingConfirmation: nop,
    };
  }

  return function ctor_wifip2p() {
    var elements;

    function debug(msg) {
      dump('----------- Wifi Direct Settings: ' + msg);
    }

    var panel = SettingsPanel({
      onInit: function(panel) {
        if (!gWifiP2pManager) {
          debug("WifiP2pManager doesn't exist!");
          //return;
        }

        elements = {
          panel: panel,
          wifi: panel,
          toggleEnabledCheckbox: panel.querySelector('#wifip2p-enabled input'),
          goIntentBlock: panel.querySelector('#p2p-go-intent-column small'),
          goIntentColumn: panel.querySelector('#p2p-go-intent-column'),
          wpsColumn: panel.querySelector('#p2p-wps-column'),
          wpsInfoBlock: panel.querySelector('#p2p-wps-column small'),
          peerList: panel.querySelector('#wifiP2pPeerList'),
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

        gWifiP2pPeerList = WifiP2pPeerList(elements.panel.querySelector('#wifiP2pPeerList'));

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
      debug('onToggleEnabled....');
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
      debug('onWpsColumnClick...........');
      SettingsUtils.openDialog('wifip2p-wps', {
        onSubmit: function() {
          gWpsMethod = wifiP2pContext.wpsOptions.selectedMethod;
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
        debug(JSON.stringify(evt));

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

    //
    // Ctor of WifiP2pPeerList.
    //
    function WifiP2pPeerList(aList) {
      // clear the network list
      function clear() {
        // remove all items except the text expl. and the "search again" button
        var peerItems = aList.querySelectorAll('li:not([data-state])');
        var len = peerItems.length;
        for (var i = len - 1; i >= 0; i--) {
          aList.removeChild(peerItems[i]);
        }
      }

      function onPeerClicked(aPeerInfo) {
        if (aPeerInfo.connectionStatus === "connected") {
          debug('Peer is connected. Disconnect it!');
          gWifiP2pManager.disconnect(aPeerInfo.address);
        } else {
          debug('Peer is diconnected. Connect it!');
          debug('aPeerInfo.wpsCapabilities: ' + aPeerInfo.wpsCapabilities);
          if (-1 === aPeerInfo.wpsCapabilities.indexOf(gWpsMethod)) {
            debug("Peer doesn't support the wps method we prefer: " + gWpsMethod);
            return;
          }
          gWifiP2pManager.connect(aPeerInfo.address, gWpsMethod, gGoIntent);
        }
      }

      function setPeerList(aPeerList) {
        clear();
        debug("PeerList to set: " + JSON.stringify(aPeerList));
        for (var i = 0; i < aPeerList.length; i++) {
          var listItem = newPeerListItem(aPeerList[i], onPeerClicked);
          aList.appendChild(listItem);
        }
      }

      function newPeerListItem(aPeerInfo, aCallback) {
        /**
         * A Wi-Fi list item has the following HTML structure:
         *   <li>
         *     <small> Network Security </small>
         *     <a [class="wifi-secure"]> Network SSID </a>
         *   </li>
         */

        var name = document.createElement('a');
        name.textContent = aPeerInfo.name;

        var connectionStatus = document.createElement('small');
        connectionStatus.textContent = aPeerInfo.connectionStatus;

        // create list item
        var li = document.createElement('li');
        li.appendChild(connectionStatus);
        li.appendChild(name);

        // bind connection callback
        li.onclick = function() {
          aCallback(aPeerInfo);
        };

        return li;
      }

      // API
      return {
        clear: clear,
        setPeerList: setPeerList
      };
    }

    return panel;
  };


});
