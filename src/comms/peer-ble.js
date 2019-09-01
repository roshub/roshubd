//const events = require('events');

const ChildProcess = require('child_process')
const Hoek = require('hoek')
const debug = require('debug')('roshubd.comms.peer-ble')
const verbose = require('debug')('roshubd.comms.peer-ble.verbose')

const Task = require('../task')
const ClientSession = require('../client-session')
const ClientContext = require('../client-context')

const CMD = ((process.env.SNAP) ? (process.env.SNAP + '/bin/bleSerialServer') : 'roshub-ble-serial-server.ble-serial-server' )

class BLEBridge extends Task {

  constructor(context) {
    super({name:BLEBridge.type(),background:true, context})
    this.process = undefined
    this.client = undefined
    this.actor = undefined
    this.owner = undefined
  }

  static type(){
    return 'comms.peer-ble'
  }

  async onMessage(ctx){
    return this.context.runCommand(ctx)
  }

  async exec(input){
    debug('exec')
    let config = this.context.local.config

    this.actor = Hoek.reach(this.context, 'party.actor')
    this.owner = Hoek.reach(this.context, 'party.actor.data.owner')

    let commandArr = [ /*CMD*/ ]

    if(this.owner){ commandArr.push('-o',  this.owner.id, '-y', this.owner.type) }
    if(this.actor){ commandArr.push('-a',  this.actor.id, '-t', this.actor.type) }

    if(process.env.SNAP){
      this.process = ChildProcess.spawn(CMD, commandArr)
    }
    else{
      this.process = ChildProcess.spawn('sudo', [].concat([CMD],commandArr))
    }

    this.process.stdout.on('data', this.onProcessOutData.bind(this))
    this.process.stderr.on('data', this.onProcessErrData.bind(this))
    this.process.on('error', this.onProcessError.bind(this))

    this.process.on('close', this.onProcessExit.bind(this))

    this.on('message', async ctx => {
      await this.onMessage(ctx)
    })

    return this.detach()
  }

  async restart() {
    debug('restarting');
    this.actor = Hoek.reach(this.context, 'party.actor')
    this.owner = Hoek.reach(this.context, 'party.actor.data.owner')

    await this.stop()
    this.context.runner.setTaskState(this.name, 'pending')
  }


  async stop(){
    debug('stopping');

    if(this.process){

      if(this.client){ this.drop() }
      
      this.process.kill('SIGINT');
    }
    
    this.process = undefined
    this.client = undefined
    this.backgroundResolve()
    return
  }


  drop(){
    debug("Dropping...")
    if(!this.process){ return }
    this.process.stdin.write(JSON.stringify({code:'tx', data:{event:"drop"}})+'\n')	//Tell the client we are dropping them
    this.process.stdin.write(JSON.stringify({code:'drop'})+'\n')										//Tell serial server to drop current client
  }

  send(obj){
    if(!this.process){ return }

    return new Promise((resolve,reject)=>{
      this.process.stdin.write(
        JSON.stringify({code:'tx', data:obj})+'\n',
        'utf8',
        (err)=>{
          if(!err){ return resolve() }
          reject(err)
        }
      )
    })
  }

  onProcessOutData(data){
    verbose('stdout: ' + data);
    try{
      let parsedData = JSON.parse(data);
      if(parsedData.code !== undefined){
        switch(parsedData.code){
          case 'status':
            if(parsedData.state == 'connected'){
              this.client = new ClientSession({
                comms: this,
                source: 'ble',
                client: parsedData.client.address
              })

              this.emit('connection', this.client)
            }
            else if(parsedData.state == 'listen'){
              this.emit('listen')
              debug('listening')
              this.emit('disconnect', this.client)
              if(this.client){ this.client.debug('session closed'); delete this.client }
              this.client = undefined;
            }
            break;
          case 'rx':
            this.emit(parsedData.code, parsedData);
            if(parsedData.code == 'rx'){
              if(!this.client){
                debug('unknown session')
                this.drop()
                return
              }
              this.emit('message', new ClientContext({
                request: JSON.parse(parsedData.data),
                session: this.client
              }))
            }

            break;
          default:
            debug('Command not recognized: ' + parsedData.code);
            break;
        }
      }
      else{
        debug('Invalid input: ' + data);
        this.send({err: "Invalid"})
      }
    }
    catch(e){
      console.error("Caught exception in onProcessOutData - ");
      console.error(e);
      this.send({err: "Invalid"})
    }
  }

  onProcessErrData(data){
    debug('stderr: ' + data);
  }

  onProcessError(v){
    debug('Error: ' + v)
  }


  onProcessMsg(v){
    debug('Msg: ' + JSON.stringify(v))

    if(v.cmd == 'drop'){
      this.drop()
    }
  }

  onProcessExit(code, signal){
    debug('child process exited. code:' + code + ',sig:' + signal);
    this.emit('exit')

    this.process = undefined
    this.client = undefined
    this.backgroundReject('child process exited. code:' + code + ',sig:' + signal)
  }

}

module.exports = BLEBridge
