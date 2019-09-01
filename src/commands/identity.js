const path = require('path')
const Hoek = require('hoek')
const debug = require('debug')('roshubd.commands.identity')

const Handler = async function(context){

  const op = Hoek.reach(context, 'request.op')

  context.debug('handling identity', context.party.identity)

  return context.party.identity
}

module.exports = {
  name: path.basename(__filename).replace('.js',''),
  handler: Handler
}

