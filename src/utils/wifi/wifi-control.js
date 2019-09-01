// Generated by CoffeeScript 2.0.3
(function() {
  // (1) Load NPM Dependencies.

// node-wifiscanner2 is a great NPM package for scanning WiFi APs (for Windows & Mac -- it REQUIRES sudo on Linux).
var CXT, WiFiScanner, execSyncToBuffer, os_instructions;

WiFiScanner = require('node-wifiscanner2');

// To execute commands in the host machine, we'll use sync-exec.
// Note: In nodejs >= v0.12 this will default to child_process.execSync.
execSyncToBuffer = require('sync-exec');


// (2) We use this CXT variable to supply the context
//     for methods defined inside the OS-specific files.
//     This provides a common context without polluting
//     the global namespace.

CXT = {
  
  // Define WiFiControl settings.

  WiFiControlSettings: {
    iface: null,
    debug: false,
    connectionTimeout: 5000
  },
  
  // execSync: Executes command with options via child_process.execSync,
  //           but guarantees output as a String instead of a buffer.

  execSync: function(command, options = {}) {
    var results;
    results = execSyncToBuffer(command, options);
    if (!results.status) {
      return results.stdout;
    }
    throw {
      stderr: results.stderr
    };
  },
  
  // WiFiLog:        Helper method for debugging and throwing
  //                 errors.

  WiFiLog: function(msg, error = false) {
    if (error) {
      return console.error(`WiFiControl: ${msg}`);
    } else {
      if (this.WiFiControlSettings.debug) {
        return console.log(`WiFiControl: ${msg}`);
      }
    }
  }
};


// (3) Load OS-specific instructions from file.

switch (process.platform) {
  case "linux":
    os_instructions = require('./linux.js');
    break;
  case "win32":
    os_instructions = require('./win32.js');
    break;
  case "darwin":
    os_instructions = require('./darwin.js');
    break;
  default:
    CXT.WiFiLog("Unrecognized operating system.", true);
    process.exit();
}


// (4) Define WiFiControl Methods.

module.exports = {
  
  // init:   Initial setup.  This is almost the same as config, except it
  //         adds the additional step of attempting to automatically locate
  //         a network interface if one was not specified in settings.

  //         This is optional, provided you manually set an interface by calling
  //         WiFiControl.configure({iface: "myifc"}), or by triggering the automatic
  //         interface lookup by calling WiFiControl.findInterface() elsewhere in
  //         the code before attempting to scan/(dis)connect.

  init: function(settings = {}) {
    // Apply any manual settings passed in.
    this.configure(settings);
    if (settings.iface == null) {
      // Make sure we try to find an interface if none specified:
      //   (WiFiControl.configure will not do so!)
      return this.findInterface(settings.iface);
    }
  },
  
  // configure:    Update or change settings such as debug state or manual
  //               network interface selection.

  configure: function(settings = {}) {
    // Configure debug settings.
    if (settings.debug != null) {
      CXT.WiFiControlSettings.debug = settings.debug;
      CXT.WiFiLog(`Debug mode set to: ${settings.debug}`);
    }
    if (settings.connectionTimeout != null) {
      settings.connectionTimeout = parseInt(settings.connectionTimeout);
      CXT.WiFiControlSettings.connectionTimeout = settings.connectionTimeout;
      CXT.WiFiLog(`AP connection attempt timeout set to: ${settings.connectionTimeout}ms`);
    }
    if (settings.iface != null) {
      // Set network interface to settings.iface.
      return this.findInterface(settings.iface);
    }
  },
  
  // findInterface:  Search host machine to find an active
  //                 WiFi card interface.

  findInterface: function(iface = null) {
    var _msg, error, interfaceResults;
    try {
      // If user is forcing an interface manually, do that.
      if (iface != null) {
        _msg = `Wireless interface manually set to ${iface}.`;
        CXT.WiFiLog(_msg);
        CXT.WiFiControlSettings.iface = iface;
        return {
          success: true,
          msg: _msg,
          interface: iface
        };
      }
      
      // (1) First, we find the wireless card interface on the host.

      CXT.WiFiLog("Determining system wireless interface...");
      interfaceResults = os_instructions.autoFindInterface.call(CXT);
      CXT.WiFiControlSettings.iface = interfaceResults.interface;
      return interfaceResults;
    } catch (error1) {
      error = error1;
      _msg = `Encountered an error while searching for wireless interface: ${error}`;
      CXT.WiFiLog(_msg, true);
      return {
        success: false,
        msg: _msg
      };
    }
  },
  
  // scanForWiFi:   Return a list of nearby WiFi access points by using the
  //                host machine's wireless interface.  For this, we are using
  //                the NPM package node-wifiscanner2 by Particle (aka Spark).

  //                This is an async method and it will return its results through
  //                a user provided callback, cb(err, resp).

  scanForWiFi: function(cb) {
    var _msg, error, networks;
    if (CXT.WiFiControlSettings.iface == null) {
      _msg = "You cannot scan for nearby WiFi networks without a valid wireless interface.";
      CXT.WiFiLog(_msg, true);
      return {
        success: false,
        msg: _msg
      };
    }
    try {
      CXT.WiFiLog("Scanning for nearby WiFi Access Points...");
      if (process.platform === "linux") {
        networks = os_instructions.scanForWiFi.apply(CXT);
        _msg = `Nearby WiFi APs successfully scanned (${networks.length} found).`;
        CXT.WiFiLog(_msg);
        return cb(null, {
          success: true,
          msg: _msg,
          networks: networks
        });
      } else {
        return WiFiScanner.scan(function(err, networks) {
          if (err) {
            _msg = `We encountered an error while scanning for WiFi APs: ${error}`;
            CXT.WiFiLog(_msg, true);
            return cb(err, {
              success: false,
              msg: _msg
            });
          } else {
            _msg = `Nearby WiFi APs successfully scanned (${networks.length} found).`;
            CXT.WiFiLog(_msg);
            return cb(null, {
              success: true,
              networks: networks,
              msg: _msg
            });
          }
        });
      }
    } catch (error1) {
      error = error1;
      _msg = `We encountered an error while scanning for WiFi APs: ${error}`;
      CXT.WiFiLog(_msg, true);
      return cb(error, {
        success: false,
        msg: _msg
      });
    }
  },
  
  // connectToAP:    Direct the host machine to connect to a specific WiFi AP
  //                 using the specified parameters.
  //                 pw is an optional parameter; calling with only an ssid
  //                 connects to an open network.

  connectToAP: function(_ap, cb) {
    var _msg, check_iface, error, request_msg, t0;
    if (CXT.WiFiControlSettings.iface == null) {
      _msg = "You cannot connect to a WiFi network without a valid wireless interface.";
      CXT.WiFiLog(_msg, true);
      return {
        success: false,
        msg: _msg
      };
    }
    try {
      
      // (1) Verify there is a valid SSID

      if (!_ap.ssid.length) {
        return {
          success: false,
          msg: "Please provide a non-empty SSID."
        };
      }
      
      // (2) Verify there is a valid password (if no password, just add an empty one == open network)

      if (_ap.password == null) {
        _ap.password = "";
      }
      
      // (3) Do the OS-specific dirty work

      os_instructions.connectToAP.call(CXT, _ap);
      
      // (4) Now we keep checking the state of the network interface
      //     to make sure it ends up actually being connected to the
      //     desired SSID.

      request_msg = `WiFi connection request to "${_ap.ssid}" has been processed.`;
      CXT.WiFiLog(request_msg);
      
      // (5) check_iface is a helper function we use to repeatedly
      //     check on the ifaceState using setTimeouts.  This containment
      //     is important because it makes it possible to implement
      //     connectionTimeout.

      t0 = new Date();
      check_iface = (_ap, cb) => {
        var connect_to_ap_result, ifaceState;
        ifaceState = this.getIfaceState();
        // If the connection is settled, check if we're connected
        // to the requested _ap.
        if (ifaceState.success && ((ifaceState.connection === "connected") || (ifaceState.connection === "disconnected"))) {
          if (ifaceState.ssid === _ap.ssid) {
            
            // We're connected, and on the right SSID!  Success.

            _msg = `Successfully connected to "${_ap.ssid}"`;
            CXT.WiFiLog(_msg);
            cb(null, {
              success: true,
              msg: _msg
            });
          } else if (ifaceState.ssid == null) {
            
            // Device is not connected to any known SSID

            _msg = "Error: Interface is not currently connected to any wireless AP.";
            CXT.WiFiLog(_msg, true);
            cb(_msg, {
              success: false,
              msg: `Error: Could not connect to ${_ap.ssid}`
            });
          } else {
            
            // We're connected, but to the wrong SSID!

            _msg = `Error: Interface is currently connected to "${ifaceState.ssid}"`;
            CXT.WiFiLog(_msg, true);
            connect_to_ap_result = {
              success: false,
              msg: _msg
            };
            cb(_msg, {
              success: false,
              msg: `Error: Could not connect to ${_ap.ssid}`
            });
          }
          return;
        }
        // Attempt to confirm connection up to connectionTimeout milliseconds
        if ((new Date() - t0) < CXT.WiFiControlSettings.connectionTimeout) {
          return setTimeout(function() {
            return check_iface(_ap, cb);
          }, 250);
        } else {
          return cb(`Connection confirmation timed out. (${CXT.WiFiControlSettings.connectionTimeout}ms)`, {
            success: false,
            msg: `Error: Could not connect to ${_ap.ssid}`
          });
        }
      };
      
      // (6) Start the check_iface loop
      //     This will eventually return the user's callback "cb".

      return check_iface(_ap, cb);
    } catch (error1) {
      error = error1;
      _msg = `Encountered an error while connecting to "${_ap.ssid}": ${error}`;
      CXT.WiFiLog(_msg, true);
      return cb(error, {
        success: false,
        msg: _msg
      });
    }
  },
  
  // resetWiFi:    Attempt to return the host machine's wireless to whatever
  //               network it connects to by default.

  resetWiFi: function(cb) {
    var _msg, check_iface, error, t0;
    try {
      
      // (1) Choose commands based on OS.

      os_instructions.resetWiFi.call(CXT);
      
      // (2) Ensure that the power has been restored to the interface!

      CXT.WiFiLog("Waiting for interface to finish resetting...");
      
      // (3) check_iface is a helper function we use to repeatedly
      //     check on the ifaceState using setTimeouts.  This containment
      //     is important because it makes it possible to implement
      //     connectionTimeout.

      t0 = new Date();
      check_iface = (cb) => {
        var _msg, ifaceState;
        ifaceState = this.getIfaceState();
        // If the connection is settled, check if we're connected
        // to the requested _ap.
        if (ifaceState.success && ((ifaceState.connection === "connected") || (ifaceState.connection === "disconnected"))) {
          _msg = "Success!  Wireless interface is now reset.";
          cb(null, {
            success: true,
            msg: _msg
          });
          return;
        }
        // Attempt to confirm connection up to connectionTimeout milliseconds
        if ((new Date() - t0) < CXT.WiFiControlSettings.connectionTimeout) {
          return setTimeout(function() {
            return check_iface(cb);
          }, 250);
        } else {
          return cb(`Reset confirmation timed out. (${CXT.WiFiControlSettings.connectionTimeout}ms)`, {
            success: false,
            msg: "Error: Could not completely reset WiFi."
          });
        }
      };
      
      // (4) Start the check_iface loop
      //     This will eventually return the user's callback "cb".

      return check_iface(cb);
    } catch (error1) {
      error = error1;
      _msg = `Encountered an error while resetting wireless interface: ${error}`;
      CXT.WiFiLog(_msg, true);
      return cb(error, {
        success: false,
        msg: _msg
      });
    }
  },
  
  // getIfaceState:     Return current connection state of the network
  //                    interface and what SSID it is connected to.
  getIfaceState: function() {
    var _msg, error, interfaceState;
    try {
      
      // Return network interface state.

      interfaceState = os_instructions.getIfaceState.call(CXT);
      if (interfaceState.success !== false) {
        interfaceState.success = true;
        interfaceState.msg = `Successfully acquired state of network interface ${CXT.WiFiControlSettings.iface}.`;
      }
      return interfaceState;
    } catch (error1) {
      error = error1;
      _msg = `Encountered an error while acquiring network interface connection state: ${error}`;
      CXT.WiFiLog(_msg, true);
      return {
        success: false,
        msg: _msg
      };
    }
  }
};

}).call(this);
