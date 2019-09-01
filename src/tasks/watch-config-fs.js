const FS = require('fs')
const watch = require('node-watch')
const debug = require('debug')('roshubd.task.watch-config-hs')

const Task = require('../task')

class WatchConfigFs extends Task {
  constructor(roshubd){
    super({
      name: WatchConfigFs.type(), context: roshubd, background: true,
      depends: ['state.init']
    })
  }

  async stop(){
    debug('stop')
    if(this.configWatcher && !this.configWatcher.isClosed()){
      this.configWatcher.close()
      delete this.configWatcher
      this.configWatcher = undefined
    }
  }

  async exec(input){
    debug('exec')
    let config = this.context.local.config

    const basePath = config.basePath
    this.configWatcher = watch(basePath, {recursive: false})
    this.configWatcher.on('change', async (evt,name)=>{
      debug('configWatcher - evt=',evt, 'name=',name)
      await this.handleFileChange(evt, name) 
    })

    return this.detach()
  }

  async handleFileChange(evt, name) {
    try {
      const basePath = this.context.local.config.basePath
      if (evt == 'update' && name.indexOf(basePath + '/set-actor') == 0) {
        debug('set-actor')
        const actorBase64 = FS.readFileSync(name, { encoding: 'utf8' }).trim()

        if (actorBase64.length <= 0) {
          throw new Error('Actor is empty')
        }

        const actorUtf8 = base64.decode(actorBase64)
        const actorString = utf8.decode(actorUtf8)
        const actor = JSON.parse(actorString)

        debug('set-actor =', actor)
        
        const session = new ClientSession({
          source: 'file', 
          comms: undefined, 
          client: name 
        })

        const context = new ClientContext({
          request: { op: 'enroll', actor },
          session
        })

        return this.context.runCommand(context)
      }
    }
    catch (err) {
      debug(err)
    }
  }

  static type(){
    return 'tasks.watch-config-fs'
  }
}

module.exports = WatchConfigFs