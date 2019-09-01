'use strict';

const path = require('path');
const debug = require('debug')('roshubd.comms')

const exposed = {}

/* require("fs").readdirSync(__dirname).forEach( (file)=>{
  if(file == path.basename(__filename)){return}
  debug(file)

  const name = path.basename(file, '.js')
  const handler = require('./' + name)

  exposed[name] = handler
}); */


module.exports = {
  "sync-build" : require('./sync-build'),
  "sync-code" : require('./sync-code'),
  "sync-packages" : require('./sync-packages'),
  "watch-config-fs" : require('./watch-config-fs'),
}
