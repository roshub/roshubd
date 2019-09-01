const FS = require('fs')
const debug = require('debug')('roshubd.state.enroll')

const Task = require('../task')


class EnrollState extends Task {
  constructor(roshubd){
    super({
      name: EnrollState.type(), context: roshubd, background: true,
      depends: ['state.init']
    })

    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
  }

  async onFailure(){
    debug('enroll task failed, go back to init')
    await this.context.stateTask('init')
  }

  async onSuccess(){
    debug('enroll task success, go to enrolled')
    await this.context.stateTask('enrolled')

    let bleTask = this.context.loadTask('comms.peer-ble')
    if(!bleTask){ await bleTask.restart() }
  }

  async onPartyOpen(){
    debug('party opened')
    this.backgroundResolve(true)
  }

  async exec(input){
    debug('exec')

    await this.context.party.resetIdentity()

    this.context.party.rest.on('open', async () => {
      await this.onPartyOpen()
    })

    this.context.setStatusGlimmer('yellow')

    return this.detach()
  }

  static type(){
    return 'state.enroll'
  }
}

module.exports = EnrollState