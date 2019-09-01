const path = require('path')
const Hoek = require('hoek')
const debug = require('debug')('roshubd.commands.identity')

const Handler = async function(context){

  const op = Hoek.reach(context, 'request.op')
  context.debug('handling unenroll')

  await context.party.config.write('actor', null)

  /** TODO: make this less hacky! */
  context.debug('unenroll success, quitting in 3sec')

  setTimeout(()=>{
    process.exit(0)
  }, 3000)

  return true
}

module.exports = {
  name: path.basename(__filename).replace('.js',''),
  handler: Handler
}

