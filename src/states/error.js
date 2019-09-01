const debug = require('debug')('roshubd.state.error')

const Task = require('../task')


class ErrorState extends Task {
  constructor(roshubd){
    super({name: ErrorState.type(), context: roshubd, background: true})

    this.canParty = false

    this.on('done', this.onDone.bind(this))


    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
  }

  async onFailure(){
    debug('failure')
    debug(this.failure)
    debug(JSON.stringify(this.failure))
  }

  async onSuccess(){
    debug('success')
    await this.context.reset()
  }


  async onDone(){
    debug('on done')
    await this.context.remote.config.unwatch(this.onConfigChange.bind(this))
  }

  async onConfigChange(){
    debug('config change')
    this.backgroundResolve(true)
  }

  async exec(){
    this.context.setStatusGlimmer('red')
    this.context.runner.printTaskLists()

    await this.context.remote.config.watch(true, true, this.onConfigChange.bind(this))

    debug('waiting for changes')

    return this.detach()
  }

  static type(){
    return 'state.error'
  }
}

module.exports = ErrorState