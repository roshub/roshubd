const path = require('path')
const debug = require('debug')('roshubd.commands.wifi-scan')

const Handler = async function(context){
  let wifiTask = await context.manager.loadTask('comms.network-wifi')

  let scan = await wifiTask.scanForWiFi()
  debug(scan)
  return scan
}

/**
 * 
 */

module.exports = {
  handler: Handler
}