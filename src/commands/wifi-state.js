const path = require('path')
const debug = require('debug')('roshubd.commands.wifi-state')

const Handler = async function(context){
  let wifiTask = await context.manager.loadTask('comms.network-wifi')
  let status = await wifiTask.updateStatus()
  debug(status.state)
  return status.state
}


module.exports = {
  handler: Handler
}
