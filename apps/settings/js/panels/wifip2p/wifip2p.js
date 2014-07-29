/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle Wi-Fi settings
navigator.mozL10n.ready(function wifiDirectSettings() {
  function debug(msg) {
    dump('----------- Wifi Direct Settings: ' + msg);
  }

  if (!navigator.mozWifiP2pManager) {
    debug("WifiP2pManager doesn't exist!");
    return;
  }

  var gWifiP2pManager = navigator.mozWifiP2pManager;

  var gWpsMethod = "pbc";
  var gGoIntent = 1;

  var DEVICE_NAME = "I am Mozillian!";

  var ECHO_SERVER_PORT = 7890;
  var ECHO_TESTING_MESSAGE = "How do you turn this on";

  gWifiP2pManager.setScanEnabled(true);

  //--------------------------------------------------
  // Listen to wifi direct events.
  //--------------------------------------------------

  gWifiP2pManager.onstatuschange = function onWifiP2pStatusChange(event) {
    debug("WifiP2pManager.onstatuschange()");

    if (gWifiP2pManager.groupOwner) {
      debug("Current Group owner: macAddress: " + gWifiP2pManager.groupOwner.macAddress +
            ", ipAddress: " + gWifiP2pManager.groupOwner.ipAddress +
            ", isLocal: " + gWifiP2pManager.groupOwner.isLocal);

      if (gWifiP2pManager.groupOwner.isLocal) {
        startEchoServer(ECHO_SERVER_PORT);
      } else {
        setTimeout(function() {
          startEchoClient(gWifiP2pManager.groupOwner.ipAddress, ECHO_SERVER_PORT);
        }, 2000);
      }
    }

    debug('The peer whose status has just changed is: ' + event.peerAddress);

    var req = gWifiP2pManager.getPeerList();
    req.onsuccess = function onGetPeerListSuccess() {
      var peerList = req.result;
      debug("onGetPeerListSuccess(), peerList = " + JSON.stringify(peerList));
      gWifiP2pPeerList.setPeerList(peerList);
    };
  };

  gWifiP2pManager.onenabled = function onWifiP2pEnabled() {
    debug("WifiP2pManager.onenabled()");
    gWifiP2pPeerList.clear();
    gWifiP2pManager.setScanEnabled(true);
  };

  gWifiP2pManager.ondisabled = function onWifiP2pDisabled() {
    debug("WifiP2pManager.onenabled()");
    gWifiP2pPeerList.clear();
  };

  gWifiP2pManager.onpeerinfoupdate = function onWifiP2pPeerInfoUpdate() {
    debug("WifiP2pManager.onpeerinfoupdate()");
    var req = gWifiP2pManager.getPeerList();
    req.onsuccess = function onGetPeerListSuccess() {
      var peerList = req.result;
      debug("onGetPeerListSuccess(), peerList = " + JSON.stringify(peerList));
      gWifiP2pPeerList.setPeerList(peerList);
    };
  };

  // Register system message for wifi direct pairing request.
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

  //--------------------------------------------------
  // DOM manipulations
  //--------------------------------------------------

  // Temporarily use the checkbox the enable wifi direct scan.
  document.querySelector('#wifip2p-enabled input').onchange = function () {
    gWifiP2pManager.setScanEnabled(true);
  };

  // Go intent column
  function updateGoIntent() {
    document.querySelector('#p2p-go-intent-column small').textContent = gGoIntent;
  }
  updateGoIntent();
  document.getElementById('p2p-go-intent-column').onclick = function() {
    var goIntent = parseInt(prompt("GO Intent"), 10);
    if (isNaN(goIntent) || goIntent < 0 || goIntent > 15) {
      debug('Invalid go intent');
      return;
    }
    gGoIntent = goIntent;
    updateGoIntent();
  };

  // WPS method column
  function updateWpsMethod() {
    document.querySelector('#p2p-wps-column small').textContent = gWpsMethod;
  }
  updateWpsMethod();
  document.getElementById('p2p-wps-column').onclick = function() {
    function wpsCallback(method) {
      gWpsMethod = method;
      updateWpsMethod();
    }

    function wpsDialog(dialogID, callback) {
      var dialog = document.getElementById(dialogID);
      if (!dialog) {
        return;
      }
      openDialog(dialogID, function onSubmit() {
        callback(dialog.querySelector("input[type='radio']:checked").value);
      });
    }

    wpsDialog('wifip2p-wps', wpsCallback);
  };

  var gWifiP2pPeerList = (function wifiP2pPeerList(aList) {
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

    // API
    return {
      clear: clear,
      setPeerList: setPeerList
    };
  }) (document.getElementById('wifiP2pPeerList'));

  // Echo server/client
  function startEchoServer(aServerPort) {
    var listenSocket = navigator.mozTCPSocket.listen(aServerPort, { binaryType: "string" });
    listenSocket.onconnect = function(aClient) {
      debug('onconnect!!!!!!!!!!!');

      aClient.onerror = function(evt) {
        debug('onerror!!!! ' + ": " + evt.data.message);
      };

      aClient.onclose = function(evt) {
        debug('onclose!!!! ' + evt.data.name + ": " + evt.data.message);
      };

      aClient.ondata = function(evt) {
        var d = evt.data;
        debug('Receved from client: ' + d);
        aClient.send(d);

        if (0 === d.indexOf(ECHO_TESTING_MESSAGE)) {
          alert('Wifi Direct echo test PASS! (group owner)');
        }
      };
    };
  }

  function startEchoClient(aServerIp, aServerPort) {
    var socket = navigator.mozTCPSocket.open(aServerIp, aServerPort);
    if (!socket) {
      debug('mozTCPSocket unavailable');
      return;
    }

    socket.onopen = function(evt) {
      socket.send(ECHO_TESTING_MESSAGE);
    };

    socket.onerror = function(evt) {
      debug('onerror!!!! ' + ": " + evt.data.message);
    };

    socket.ondata = function(evt) {
      var buf = evt.data;
      debug('ondata: ' + buf);
      if (0 === buf.indexOf(ECHO_TESTING_MESSAGE)) {
        alert('Wifi Direct echo test PASS! (client)');
      }
    };
  }
});
