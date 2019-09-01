const path = require('path')
const Hoek = require('hoek')
const debug = require('debug')('roshubd.commands.identity')

const Handler = async function(context){

  const op = Hoek.reach(context, 'request.op')
  const uri = Hoek.reach(context, 'request.cloud.uri')
  const wsUri = Hoek.reach(context, 'request.cloud.wsUri')

  context.debug('handling enroll actor = ', context.request.actor, 'owner =', context.request.owner)

  if(uri){
    context.debug('enroll cloud uri -', uri)
    await context.party.config.write('cloud.uri', uri)
  }

  if(wsUri){
    context.debug('enroll cloud wsUri -', wsUri)
    await context.party.config.write('cloud.wsUri', wsUri)
  }

  await context.party.config.write('actor', context.request.actor)
  await context.party.start()

  context.debug('login success')
  return true
}

module.exports = {
  name: path.basename(__filename).replace('.js',''),
  handler: Handler
}

