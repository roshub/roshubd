const Hoek = require('hoek')
const debug = require('debug')('roshubd.Roshubd')
const deepSet = require('deep-set')

const RosHub = require('@roshub/api')
const Config = RosHub.Config
const TaskRunner = require('./task-runner')
const Blink = require('./utils/blink')


const BASE_PATH = process.env.ROSHUBD_BASE_PATH || process.env.SNAP_COMMON ||  (process.env.HOME ? process.env.HOME + '/.roshubd' : '.')
const DEFAULT_CONFIG = {
  basePath: BASE_PATH,
  comms: ['peer-ble', 'network-wifi', 'network-ethernet'],
}


const Comms = require('./comms')
const Tasks = require('./tasks')
const States = require('./states')

const Commands = require('./commands')

class Roshubd {
  constructor(){
    this.runner = new TaskRunner()
    this.runner.on('running', ()=>{ debug('running TaskRunner - ', this.runner.taskOrder); this.runner.printTaskLists() })
    this.runner.on('idle', ()=>{ debug('idle TaskRunner - ', this.runner.taskOrder); this.runner.printTaskLists() })
    this.runner.on('task-success', (task)=>{ debug('success - Task - ', task.name) })
    this.runner.on('task-failure', (task)=>{ debug('failure - Task - ', task.name) })


    this.local = {
      config: new Config(DEFAULT_CONFIG),
      comms: Comms,
      modules: [],
      tasks: Tasks,
      state: States,
      commands: Commands,
    }

    this.remote = {
      actor: undefined,
      config: undefined,
      status: undefined,
      info: undefined //! deviceinfo
    }
    
    this.party = new RosHub.Api({
      uri: this.local.config.read('uri'),
      wsUri: this.local.config.read('ws-uri'),
      config: this.local.config
    })

    this.statusMode = undefined
    this.statusColor = undefined
    this.statusInterval = undefined
  }

  async assertNoActiveState(){
    const currentState = await this.currentStateTask()
    if(!currentState){ return }

    throw new Error('already have a running state ['+currentState+']')
  }

  async commsTask(taskName){
    return await this.loadTask('comms.'+ taskName)
  }

  async stateTask(taskName){
    debug('stateTask - ', taskName)

    await this.assertNoActiveState()
    const result = this.loadTask('state.'+ taskName)

    if(this.remote.status){
      this.remote.status.setState(taskName)
      await this.remote.status.save()
    }

    return await result
  }

  async currentStateTask(){
    const states = Object.keys(this.local.state).map(name=>{ return 'state.'+name })

    let active = []

    for(let stateName of states){
      try{
        if(this.runner.isRunning(stateName)){ active.push(stateName.replace('state.','')) }
      }
      catch(err){}
    }

    if(active.length > 1){ return active }

    return active[0]
  }

  async loadTask(taskName){
    let instance = undefined
    if(!this.runner.exists(taskName)){
      let Type = Hoek.reach(this.local, taskName)

      if(!taskName){ return }

      debug('loadTask - ', taskName)
      instance = new Type(this)
      await this.runner.addTask(instance)
      return instance
    } else {
      instance = this.runner.tasks[taskName]
    }

    if(!this.runner.isRunning(taskName)){
      this.runner.restartTask(taskName, 500)
    }

    return instance
  }

  async runCommand(context){

    debug('runCommand - ', Hoek.reach(context, 'request.op'))
    context.debug('request context', context)

    context.setParty(this.party)
    context.setManager(this)

    const op = Hoek.reach(context, 'request.op')
    const handler = Hoek.reach(this.local.commands, op + '.handler')

    try {
      if (handler) {
        context.debug('handling op -', op)

        let currentState = await this.currentStateTask()
        if(!currentState){
          if(!this.runner.isDone('state.init')){
            throw new Error('commands not allowed during state [undefined]')
          }
        }

        else if(!currentState.name == 'state.init'){
          throw new Error('commands not allowed during state ['+this.currentState.name+']')
        }

        this.setStatusColor('purple')
        const reply = await handler(context)
        const obj = { op }
        deepSet(obj, op, reply)

        await context.send(obj)
        context.debug('op[', op, '] completed')
        this.setStatusColor('blue')
      } else {
        context.debug('no such handler')
      }
    } catch (error) {
      // unexpected crash in handler
      context.debug('op[', op, '] crashed with error [', error, ']')
      const obj = { op, error: error.message }
      await context.send(obj)
      context.debug('op[', op, '] error sent')
      this.setStatusColor('orange')
    }
  }

  setStatusColor(color){
    debug('status color -', color)

    this.statusMode='color'
    this.statusColor=color
    
    Blink.setColor(color)
  }

  setStatusGlimmer(color, loop=true){
    debug('status glimmer -', color)
    this.statusMode='glimmer'

    this.statusColor = color
    if(!this.statusInterval && loop){
      this.statusInterval = setInterval(()=>{

        if(this.statusMode=='glimmer'){ Blink.glimmer(this.statusColor) }
        else{ 
          Blink.setColor(this.statusColor)
          clearInterval(this.statusInterval)
          this.statusInterval = undefined
        }
        
      }, 3000)
    }
    else{
      if(this.statusInterval && !loop){
        clearInterval(this.statusInterval)
        this.statusInterval = undefined
      }

      Blink.glimmer(this.statusColor)
    }
  }

  async start(){
    //await this.init()
    await this.stateTask('init')

    return await this.runner.start()
  }

  async stop(){
    debug('stopping')
    return await this.runner.stop()
  }

  async reset(){
    debug('RESET')
    await this.stop()
    delete this.runner

    this.runner = new TaskRunner()
    this.runner.on('running', ()=>{ debug('running TaskRunner - ', this.runner.taskOrder); this.runner.printTaskLists() })
    this.runner.on('idle', ()=>{ debug('idle TaskRunner - ', this.runner.taskOrder); this.runner.printTaskLists() })
    this.runner.on('task-success', (task)=>{ debug('success - Task - ', task.name) })
    this.runner.on('task-failure', (task)=>{ debug('failure - Task - ', task.name) })
    
    debug('stopping party')
    await this.party.stop()
    delete this.party

    this.remote = {
      actor: undefined,
      config: undefined,
      status: undefined
    }

    this.party = new RosHub.Api({
      uri: this.local.config.read('uri'),
      wsUri: this.local.config.read('ws-uri'),
      config: this.local.config
    })

    await this.start()
  }
}

module.exports = Roshubd