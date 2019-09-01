'use strict';

const path = require('path');
const debug = require('debug')('roshubd.comms')

const exposed = {}

/*require("fs").readdirSync(__dirname).forEach( (file)=>{
  if(file == path.basename(__filename)){return}
  debug(file)

  const name = path.basename(file, '.js')
  const handler = require('./' + name)

  exposed[name] = handler
});*/

exposed["network-ethernet"] = require('./network-ethernet')
exposed["network-wifi"] = require('./network-wifi')
exposed["peer-ble"] = require('./peer-ble')

module.exports = exposed
