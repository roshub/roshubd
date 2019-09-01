const Dependency = require('dependency-solver')
const debug = require('debug')('TaskRunner')
const verbose = require('debug')('TaskRunner.verbose')
const {JSONPath} = require('jsonpath-plus')
const EventEmitter = require('events')

class TaskRunner extends EventEmitter {
  constructor(){
    super()
    this.holding = {}
    this.pending = {}
    this.running = {}
    this.success = {}
    this.failure = {}
    this.background = {}

    this.parallel = 10

    this.taskOrder = []

    this.started = false
    this._noWorkCount = 0
    this._runWatchdog = undefined
    this._planningInterval = 100
    this._restartDelay = 5000
  }

  async start(){
    this.started = true
    if(this._runWatchdog){ return }
    this.runTasks()
    //this._runWatchdog = setTimeout(this.runTasks.bind(this), this._planningInterval)
    this.emit('running')
  }

  async stop(){
    debug('stopping')
    this.printTaskLists()
    this.started = false
    clearTimeout(this._runWatchdog)
    this._runWatchdog = undefined

    const taskList = this.tasks
    if(taskList && this.hasWork()){
      debug('cancelling incomplete tasks')
      const nameList = Object.keys(taskList)
      for(let name of nameList){
        
        if(!this.isDone(name)){
          let task = taskList[name]
          task.off('pre-success', this.onPreSuccess.bind(this))
          task.off('pre-failure', this.onPreFailure.bind(this))
          await task.cancel()
        }
      }
    }

    if(taskList){
      Object.keys(taskList).map(name=>{
        this.resetTask(name)
      })
    }
    

    this.holding = {}
    this.pending = {}
    this.running = {}
    this.success = {}
    this.failure = {}
    this.background = {}
    this.taskOrder = []
    this.started = false
    this._noWorkCount = 0
  }

  get tasks(){
    return   Object.assign(
      {},
      this.holding,
      this.pending,
      this.running,
      this.background,
      this.success,
      this.failure
    )
  }

  get depends(){
    //let graph = {}
    const taskMap = this.tasks
    let taskList = []

    for(let taskName in taskMap){
      const task = taskMap[taskName]
      taskList.push( task )

      //verbose(taskName)

      //graph[taskName+''] = task.depends
    }

    //verbose(JSON.stringify(taskList))
    return taskList
  }

  get runOrder(){
    const depends = this.depends
    let taskOrder = []

    const tasksWithDepends = JSONPath(
      '$.graph[?(@.depends.length >0)].name',
      {graph: depends}
    )

    const tasksWithoutDepends = JSONPath(
      '$.graph[?(@.depends.length ==0)].name',
      {graph: depends}
    )

    taskOrder = taskOrder.concat(tasksWithoutDepends)

    //verbose('depends', JSON.stringify(tasksWithDepends))
    //verbose('no depends', JSON.stringify(tasksWithoutDepends))
    //verbose('taskOrder-prelim', taskOrder)
    
    if(tasksWithDepends && tasksWithDepends.length > 0){
      const graph = {}
      tasksWithDepends.map((taskName)=>{
        const task = this.tasks[taskName]
        graph[taskName]=task.depends
      })

      const solved = Dependency.solve(graph)
      //verbose('solved', solved)

      for(let taskName of solved){
        if(taskOrder.indexOf(taskName) < 0 ){
          taskOrder.push( taskName )
        }
      }
    }

    verbose('taskOrder', taskOrder)
    this.taskOrder = taskOrder
    return taskOrder
  }

  collectResults(nameList){
    const taskList = this.tasks
    let results = {}

    nameList.map((taskName)=>{ results[taskName] = taskList[taskName] })
    return results
  }

  runTasks(){
    verbose('runTasks')

    if(!this.hasWork()){
      verbose('no work')
      this._noWorkCount++

      if(this._noWorkCount >= 2){
        clearTimeout(this._runWatchdog)
        this.runningCount = undefined
        this.emit('idle')
        return
      }
    } else {
      this._noWorkCount = 0
    }

    const order = this.runOrder
    const taskList = this.tasks
    let runningCount = Object.keys(this.running).length

    verbose('Running ',runningCount,'out of',this.parallel)
    if(runningCount >= this.parallel){ 
      if(this.started){
        this._runWatchdog = setTimeout(this.runTasks.bind(this), this._planningInterval)
      }
      return
    }

    for(let taskName of order){
      verbose('review task', taskName)
      let task = taskList[taskName]
      runningCount = Object.keys(this.running).length

      try{
        if(this.canRun(task)){
          verbose('\t\tcanRun - true')
  
          switch(this.taskState(taskName)){
            case 'holding':
              this.setTaskState(taskName, 'pending')
              break;
            case 'pending':
              if(runningCount >= this.parallel) { continue }
              if(! this.allDone(task.depends)) { continue }
              this.setTaskState(taskName, (!task.background ? 'running': 'background'))
              task.once('pre-success', this.onPreSuccess.bind(this))
              task.once('pre-failure', this.onPreFailure.bind(this))
              task.run(this.collectResults(task.depends)).catch(err=>{
                debug('error while running task -', taskName)
                this.printTaskLists()
                return Promise.resolve()
              })
              break;
            default:
              break
          }
        }
        else{
          verbose('\t\tcanRun == FALSE')
        }
      } catch (err) {
        debug('failed to run task -', taskName, 'error -', err)
      }
    }


    runningCount = Object.keys(this.running).length
    verbose('Running ',runningCount,'out of',this.parallel)

    //this.printTaskLists()
    if(this.started){
      this._runWatchdog = setTimeout(this.runTasks.bind(this), this._planningInterval)
    }
  }

  printTaskLists(){
    let queues = ['holding','pending','running', 'background', 'success','failure']

    for(let queueName of queues){
      let queue = this[queueName]
      if(!queue){
        debug('queue - ', queueName, null)
        continue
      }
      debug('queue - ', queueName, 'length', Object.keys(queue).length)

      for(let taskName in queue){
        let task = queue[taskName]
        debug('\t\ttask - ', taskName, task.failure)
      }
    }
    debug(this.taskOrder)
  }

  onPreSuccess(task){
    verbose('Success - ', task.name)
    task.off('pre-success', this.onPreSuccess.bind(this))
    task.off('pre-failure', this.onPreFailure.bind(this))
    this.setTaskState(task.name, 'success')
    this.emit('task-done', task)
    this.emit('task-success', task)
  }

  onPreFailure(task){
    verbose('Failure - ', task.name, task.failure)
    task.off('pre-success', this.onPreSuccess.bind(this))
    task.off('pre-failure', this.onPreFailure.bind(this))
    this.setTaskState(task.name, 'failure')
    this.emit('task-done', task)
    this.emit('task-failure', task)

    if(task.background && !task._cancel){
      this.restartTask(task.name)
    }
  }

  restartTask(taskName, timeout){
    debug('restarting task - ', taskName, 'in', timeout||this._restartDelay, 'ms')
      setTimeout(async ()=>{
        let task = this.getTask(taskName)
        
        if(!task){return}
        await task.reset()
        this.setTaskState(taskName)
        this.addTask(task)
        if(this.started && this._runWatchdog == undefined){ this.start() }
      }, timeout||this._restartDelay)
  }
  
  resetTask(taskName, timeout){
    debug('resetting task - ', taskName, 'in', timeout||this._restartDelay, 'ms')
      setTimeout(async ()=>{
        let task = this.getTask(taskName)
        
        if(!task){return}
        await task.reset()
        this.setTaskState(taskName)
      }, timeout||this._restartDelay)
  }
  

  hasWork(){
    const queueList = ['holding', 'pending', 'running', 'background']

    for(let queueName of queueList){
      const queue = this[queueName]
      if(Object.keys(queue).length > 0 ){ 
        verbose('hasWork == true - ', queueName)
        return true
      }
    }

    verbose('hasWork == false')
    return false
  }

  isRunning(taskName){
    let state = this.taskState(taskName)
    return 'running' === state || 'background' === state
  }

  isPending(taskName){
    let state = this.taskState(name)
    return 'pending' === state || 'holding' === state
  }

  isDone(taskName){
    let state = this.taskState(taskName)
    return (['success', 'failure'].indexOf(state) > -1)
  }

  allDone(taskList){
    for(let taskName of taskList){
      if(!this.isDone(taskName)){
        verbose('not done', taskName)
        return false
      }
    }

    return true
  }


  taskState(name){
    let queueNames = ['holding','pending','running', 'background', 'success','failure']

    for(let queueName of queueNames){
      let queue = this[queueName]
      if(!queue){continue}
      for(let taskName of Object.keys(queue)){
        if(taskName == name){
          return queueName
        }
      }
    }

    throw new Error('findTask - Task ['+name+'] not found')
  }

  setTaskState(taskName, state){
    if(['holding','pending','running','background','success','failure', undefined].indexOf(state) < 0){
      throw new Error('setTaskState - Invalid state['+state+']')
    }

    let currentState = this.taskState(taskName)
    if(currentState == state ){ return }

    let currentQueue = this[ currentState ]
    let task = currentQueue[taskName]

    
    currentQueue[taskName] = undefined
    delete currentQueue[taskName]

    if(!state){ return }

    this[state][taskName] = task
    verbose('setTaskState - task ['+task.name+'] is '+state)
  }

  canRun(task){
    try{
      let ready = this.allDone(task.depends)
    }
    catch(err){
      verbose('false due to error ', task)
      return false
    }
    return true
  }

  exists(taskName){
    return this.tasks[taskName] !== undefined
  }

  async addTask(task){

    if(this.exists(task.name)){
      throw new Error('duplicate task name ['+task.name+']')
    }

    if(this.canRun(task)){
      debug('addTask - task ['+task.name+'] is pending')
      this.pending[task.name] = task

    } else {

      debug('addTask - task ['+task.name+'] is holding')
      this.holding[task.name] = task
    }

    if(this.started && this._runWatchdog == undefined){ this.start() }

    //return task.promise
    return task
  }

  getTask(taskName){
    return this.tasks[taskName]
  }

  async cancelTask(taskName){
    let task = await this.tasks[taskName]
    return task.cancel()
  }

}

module.exports = TaskRunner
