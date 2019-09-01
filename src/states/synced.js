const FS = require('fs')
const debug = require('debug')('roshubd.state.synced')

const Task = require('../task')

class SyncedState extends Task {
  constructor(roshubd){
    super({
      name: SyncedState.type(), context: roshubd, background: true,
      depends: ['state.sync']
    })

    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))

    this.watchedCodeDocs = []
    this.watchedCodeStatusDocs = []
  }

  async stop(){
    await this.context.remote.config.unwatch(this.onConfigChange.bind(this))
  }

  async onFailure(){
    debug('failure')
    await this.context.stateTask('error')
  }

  async onSuccess(){
    debug('success')
    await this.context.stateTask('enrolled')
  }

  async onConfigChange(){
    debug('config change')
    this.backgroundResolve(true)
  }

  async onCodeChange(){
    debug('code change')
  }

  async onCodeStatusChange(){
    debug('code status change')
  }

  async onDone(){
    await this.context.remote.config.unwatch(this.onConfigChange.bind(this))
  }

  async exec(input){
    debug('exec')
    this.context.runner.printTaskLists()

    this.context.setStatusGlimmer('white')

    await this.context.remote.config.watch(true, true, this.onConfigChange.bind(this))

    /**
     * @todo watch code documents and status for changes
     */

    const codeList = await this.context.remote.actor.getCodeDocumentList()

    debug(codeList)

    let pendingWatch = []

    for(let code of codeList){
      let watch = code.watch(true, true, this.onCodeChange.bind(this))
      pendingWatch.push( watch )
      this.watchedCodeDocs.push( code )

      pendingWatch.push(
        code.status().then(status=>{
          let statusWatch = code.watch(true, true, this.onCodeStatusChange.bind(this))
          pendingWatch.push( statusWatch )
          this.watchedCodeStatusDocs.push( status )  
        })
      )
    }

    await Promise.all(pendingWatch)

    debug('waiting for changes')
    this.context.setStatusColor('white')
    return this.detach()
  }

  static type(){
    return 'state.synced'
  }
}

module.exports = SyncedState