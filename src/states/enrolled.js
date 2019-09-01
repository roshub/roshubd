const FS = require('fs')
const Hoek = require('hoek')
const debug = require('debug')('roshubd.state.enrolled')

const Task = require('../task')

class EnrolledState extends Task {
  constructor(roshubd){
    super({
      name: EnrolledState.type(), context: roshubd,
      depends: ['state.init']
    })

    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
  }

  async onFailure(){
    debug('enrolled task failed, go back to init')
    await this.context.stateTask('error')
  }

  async onSuccess(){
    debug('enrolled task success, go to sync')
    await this.context.stateTask('sync')
  }

  async exec(input){
    debug('exec')

    let actor = this.context.party.actor

    actor = (await this.context.party.find().id(actor.id).type(actor.type).exec())[0]
    this.context.remote.actor = actor

    debug(actor.cleanData)

    //if (!this.context.remote.config) {
    debug('need to download and watch Device.Config')
    this.context.remote.config = await actor.config()
    //}

    //if (!this.context.remote.status) {
    debug('need to download and watch Device.Status')
    this.context.remote.status = await actor.status()
    //}

    debug('need to download and watch Device.Info')
    this.context.remote.info = await actor.info()

    if(!this.context.remote.info){
      debug('creating Device.Info')
      const rawInfo = await this.context.party.create('device_info', {
        owner: actor.idObj
      })

      this.context.remote.info = (await this.context.party.find().type(rawInfo.type).id(rawInfo.id).exec() )[0]
      debug('created Device.Info')
    }

    await this.context.local.config.write('remote', {
      config: this.context.remote.config.idObj,
      status: this.context.remote.status.idObj,
      actor: this.context.remote.actor.idObj,
      info: Hoek.reach(this.context, 'remote.info.idObj')
    })
  }

  static type(){
    return 'state.enrolled'
  }
}

module.exports = EnrolledState