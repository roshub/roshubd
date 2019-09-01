const FS = require('fs')
const debug = require('debug')('roshubd.state.sync')

const Task = require('../task')

class SyncState extends Task {
  constructor(roshubd){
    super({
      name: SyncState.type(), context: roshubd, background: true,
      depends: ['state.enrolled']
    })

    this.on('pre-failure', this.onPreFailure.bind(this))
    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
    this.on('done', this.onDone.bind(this))

    this.tasks = []
  }

  async onPreFailure(){
    debug('sync task failed, go to error')
    
    await this.context.runner.cancelTask('tasks.sync-packages')
    await this.context.runner.cancelTask('tasks.sync-code')
    await this.context.runner.cancelTask('tasks.sync-build')
    await this.context.stateTask('error')
  }

  async onFailure(){
    debug('sync task failed, go to error')
    //await this.context.stateTask('error')
  }

  async onSuccess(){
    debug('sync task success, go to synced')
    await this.context.stateTask('synced')

    this.context.runner.printTaskLists()
  }

  async onDone(){
    debug('done')
    /*await this.context.runner.resetTask('tasks.sync-packages')
    await this.context.runner.resetTask('tasks.sync-code')
    await this.context.runner.resetTask('tasks.sync-build')
    this.context.runner.printTaskLists()*/
  }

  async stop(){
    //this.cancel()
    await this.context.runner.resetTask('tasks.sync-packages')
    await this.context.runner.resetTask('tasks.sync-code')
    await this.context.runner.resetTask('tasks.sync-build')
  }

  async onTaskDone(task){
    debug('task -', task.name, 'done')
    if(this.allTasksDone() && !this.finished){
      if(this.allSuccess()){
        this._resolveBackground()
      } else {
        this.cancel()
        this._rejectBackground('task failure')
      }
    }
  }


  allTasksDone(){
    let allDone = true

    this.tasks.map(item=>{
      if(!item.finished){
        allDone = false
      }
      else if(item.finished){
        allDone &= true
      }
    })

    return allDone
  }

  allSuccess(){
    let allSuccess = true

    this.tasks.map(item=>{
      if(item.failure){
        allSuccess = false
      }
      else if(item.success){
        allSuccess &= true
      }
    })

    return allSuccess
  }

  async exec(input){
    debug('exec')

    this.context.setStatusGlimmer('blue')

    this.tasks = await Promise.all([
      await this.context.loadTask('tasks.sync-packages'),
      await this.context.loadTask('tasks.sync-code'),
      await this.context.loadTask('tasks.sync-build')
    ]).catch(err=>{throw err})

    debug(this.tasks)

    this.tasks.map(task=>{ task.once('done', this.onTaskDone.bind(this)) })

    debug('detaching')
    this.context.runner.printTaskLists()

    return this.detach()
  }

  static type(){
    return 'state.sync'
  }
}

module.exports = SyncState