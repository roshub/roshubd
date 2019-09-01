const path = require('path')
const Hoek = require('hoek')
const debug = require('debug')('roshubd.commands.wifi-connect')

const Handler = async function(context){
  let wifiTask = await context.manager.loadTask('comms.network-wifi')

  const apConfig = Hoek.reach(context, 'request.ap')
  debug(apConfig)
  let connect = await wifiTask.connectToAP(apConfig)
  return connect
}

module.exports = {
  handler: Handler
}



