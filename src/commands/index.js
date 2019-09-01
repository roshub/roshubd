'use strict';

const path = require('path');
const debug = require('debug')('roshubd.commands')

const exposed = {}


module.exports ={
  enroll : require('./enroll'),
  identity : require('./identity'),
  unenroll : require('./unenroll'),
  "wifi-connect" : require('./wifi-connect'),
  "wifi-scan" : require("./wifi-scan"),
  "wifi-state" : require("./wifi-state")
}

