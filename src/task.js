const EventEmitter = require('last-eventemitter')
debug = require('debug')('Task')

class Task extends EventEmitter {
  constructor({name, depends, exec, context, background}){
    super()
    this.name = name
    this.background = background || false //! Background tasks don't count against parallel limit
    this.context = context        //! Anything else you need
    this.depends = depends || []  //! Expected to be an array of names
    this._exec = exec
    this._cancel = false

    this.created = Date.now()
    this.started = undefined
    this.finished = undefined
    
    this.done = undefined
    this.success = undefined
    this.failure = undefined

    this._resolve = undefined
    this._reject = undefined
    //this.promise = new Promise((resolve,reject)=>{ this._resolve = resolve; this._reject = reject })



    this._resolveBackground = undefined
    this._rejectBackground = undefined
    this._detached = undefined
    debug(name)
  }

  async reset(){
    if(!this.done){ await this.cancel() }

    this._cancel = false

    this.created = Date.now()
    this.started = undefined
    this.finished = undefined
    
    this.done = undefined
    this.success = undefined
    this.failure = undefined

    this._resolve = undefined
    this._reject = undefined
    //this.promise = new Promise((resolve,reject)=>{ this._resolve = resolve; this._reject = reject })
  
    this._resolveBackground = undefined
    this._rejectBackground = undefined
    this._detached = undefined
  }

  static delayedResolve(value, delay){
    return new Promise((resolve,reject)=>{
      setTimeout(()=>{resolve(value)}, delay)
    })
  }

  static delayedReject(value, delay){
    return new Promise((resolve,reject)=>{
      setTimeout(()=>{resolve(value)}, delay)
    })
  }

  async run(dependResults){

    debug(this.name,'-',(!this.background? 'running' : 'running ( background )' ))
    try{
      this.started = Date.now()
      this.emit('running', this)
      await this.assertNotCancelled()

      let func = (!this._exec) ? this.exec.bind(this) : this._exec
      this.success = await func({task:this, depends: dependResults})
    }
    catch(err){
      debug('done - ',this.name,' - failure')
      this.failure = err
      this.finished = Date.now()
      this.done = true
      
      this.emit('pre-failure', this)
      this.emit('failure', this)
      this.emit('done', this)
      
      //this._reject(this.failure)
      throw this.failure
    }
    
    debug('done - ',this.name,' - success')
    this.finished = Date.now()
    this.done = true
    
    this.emit('pre-success', this)
    this.emit('success', this)
    this.emit('done', this)
    //this._resolve(this.success)
    return this.success
  }

  detach(){
    if(!this.background){
      throw new Error('this is not a background task, only background tasks can be datached')
    }

    if(!this._detached){
      this._detached = new Promise((resolve, reject)=>{
        this._rejectBackground = reject
        this._resolveBackground = resolve
      })
    }
    return this._detached
  }

  backgroundResolve(value){ this._resolveBackground(value) }
  backgroundReject(value){ this._rejectBackground(value) }

  async exec(){
    throw new Error('exec - must override or pass exec function at construction time')
  }

  async stop(){
    if(this.background){
      throw new Error('exec - must override stop function for background tasks')
    }
  }
  

  async cancel(){
    debug('cancelling -', this.name)
    this._cancel = true
    if(this.started){ 
      await this.stop()
      return
    }

    debug('done - ',this.name,' - failure')
    this.failure = new Error('task cancelled')
    this.finished = Date.now()
    this.emit('done', this)
    this.emit('failure', this)
    this.done = true
  }

  async assertNotCancelled(){
    if(this._cancel){ throw new Error('Task has been cancelled') }
  }

  async assertCancelled(){
    if(!this._cancel){ throw new Error('Task has not been cancelled') }
  }
}

module.exports = Task