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
  "enroll" : require('./enroll'),
"enrolled" : require('./enrolled'),
"error" : require('./error'),
"init" : require('./init'),
"sync" : require("./sync"),
"synced" : require("./synced"),

}
