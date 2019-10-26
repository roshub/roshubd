const debug = require('debug')('roshubd.state.init')

const Task = require('../task')


const EnrollTask = require('./enroll')
//const EnrolledTask = require('./enrolled')
const WatchConfigFsTask = require('../tasks/watch-config-fs')

class InitTask extends Task {
  constructor(roshubd){
    super({name: InitTask.type(), context: roshubd})

    this.canParty = false

    this.on('done', this.onDone.bind(this))
  }

  async onFailure(){
    debug('failure')
    debug(this.failure)
  }

  async onSuccess(){
    debug('success')
  }

  onDone(){
    //if(!this.canParty || !this.context.party.hasActor() || this.failure){
    if(!this.context.party.hasActor()){
      debug('waiting to be claimed . . .')
      this.context.stateTask('enroll')
    } else {
      this.context.stateTask('enrolled')
    }
  }

  async exec(){
    //! Start config
    await this.context.local.config.start()
    await this.context.local.config.save()

    //! Start comms
    await Promise.all([
      this.context.commsTask('peer-ble'),
      this.context.commsTask('network-wifi')
    ])
    

    //! Start config watcher
    this.context.loadTask(WatchConfigFsTask.type())

    this.canParty = false
    try {
      debug('get the party started')
      await this.context.party.start()
      this.canParty = this.context.party.hasActor()

      let session = await this.context.party.find().type('rest_session').id(this.context.local.config.read('rest.rest-session.id')).exec()
      debug(session)
    } catch (foo) {
      if (foo.message !== 'client needs to be enrolled') {
        debug('unexpected error!')
        debug(foo)

        if(foo.name !== 'AuthError'){ throw foo }
      }
      else{
        debug('needs enrollment')
        throw new Error('needs enrollment')
      }
    }

    debug('canParty -', this.canParty)
    debug('hasActor - ', this.context.party.hasActor())
    return this.context.local.config
  }

  static type(){
    return 'state.init'
  }
}

module.exports = InitTask