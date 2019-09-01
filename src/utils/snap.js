
const SnapClient = require('node-snapd')
const debug = require('debug')('roshubd.util.snap')

const Shell = require('./command')


const SNAP_PATH = ''

let Snap = new SnapClient()
/**
 * Show the currently installed version of the module using 
 */
exports.show = async function(name) {
  debug('show', name)
  try{
    const info = await Snap.info({name})
    return {parsed: info}
  }
  catch(error){
    if(error.code == 'snap-not-found'){
      debug('show(',name,') not installed')
      return {}
    }

    debug('show(',name,') error getting info - ', error)
    return { error }
  }
}

/**
 * Update snaps
 */
exports.update = async function(name) {
  debug('update', name)
  try{
    const info = await Snap.refresh({name})
    return {parsed: info}
  }
  catch(error){

    debug('update(',name,') error refreshing - ', error)
    return { error }
  }
}

/**
 * Install the module with the given name, optionally with the given version
 *
 * @param   {String}    name                The name of the module to install (e.g., redis-server)
 * @param   {String}    options.channel
 * @param   {String}    options.revision
 * @param   {Boolean}   options.classic / devmode / jailmode
 * @param   {Boolean}   options.devmode
 * @param   {Boolean}   options.jailmode
 * @param   {Boolean}   options.dangerous
 */
exports.install = async function(name, options={}) {
  debug('install', name)

  let cmd = ''

  if(process.env.SNAP){
    cmd = 'snap install'
  } else {
    cmd = 'sudo snap install'
  }

  if(options.channel){ cmd+=' --channel=' + options.channel }
  if(options.revision){ cmd+=' --revision=' + options.revision }
  if(options.classic){ cmd+=' --classic' }
  if(options.devmode){ cmd+=' --devmode' }
  if(options.jailmode){ cmd+=' --jailmode' }
  if(options.dangerous){ cmd+=' --dangerous' }

  cmd+=' '+name

  debug(cmd)
  const output = await Shell.exec(cmd)
  debug('install done -', cmd)

  debug('install stdout', output.stdout)
  debug('install stderr', output.stderr)

  /*return
  debug('install', name)
  try{
    const info = await Snap.install({name})
    return {parsed: info}
  }
  catch(error){
    if(error.code == 'snap-already-installed'){
      return await exports.show({name})
    }
    debug('install(',name,') error installing - ', error)
    return { error }
  }*/
}

/**
 * Uninstall the package with the given name
 */
 exports.uninstall = async function(name, options={}) {

  debug('uninstall', name)

  let cmd = ''

  if(process.env.SNAP){
    cmd = 'snap remove'
  } else {
    cmd = 'sudo snap remove'
  }

  if(options.revision){ cmd+=' --revision=' + options.revision }

  cmd+=' '+name

  debug(cmd)
  const output = await Shell.exec(cmd)
  debug('uninstall done -', cmd)

  debug('uninstall stdout', output.stdout)
  debug('uninstall stderr', output.stderr)

  return

  debug('uninstall', name)
  try{
    const info = await Snap.remove({name})
    return {parsed: info}
  }
  catch(error){
    debug('uninstall(',name,') error uninstalling - ', error)
    //return { error }
    throw error
  }
}
