const Hoek = require('hoek')
const deepSet = require('deep-set')
const ExecSh = require("exec-sh").promise
const debug = require('debug')('roshubd.sync-packages')


const Task = require('../task')
const Apt = require('../utils/apt')
const Snap = require('../utils/snap')

class SyncPackages extends Task {
  constructor(roshubd){
    super({
      name: SyncPackages.type(), context: roshubd,
      depends: ['state.enrolled']
    })

    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
  }

  async onFailure(){
    debug('failure')
    debug(this.failure)
    debug(this.failure.code)
  }

  async onSuccess(){
    debug('success')
  }

  async exec(input){
    debug('exec')

    const pkgs = this.context.remote.config.module('packages')

    debug(pkgs)

    await this.handlePackages(pkgs, 'preinstall')
    await this.handlePackages(pkgs, 'apt')
    await this.handlePackages(pkgs, 'snap')
    await this.handlePackages(pkgs, 'postinstall')

    return true
  }

  static type(){
    return 'tasks.sync-packages'
  }

  async handlePackages(pkgs, pkgPath){
    let idx = 0
    const pkgList = pkgs[pkgPath]
    for(let pkg of pkgList){
      if(pkg.script){
        debug(pkg,'command')
        await this.runCommand(pkgs, pkgPath, idx)

      } else if(pkgPath == 'apt'){
        debug(pkg,'apt')
        await this.handleAptSnapItem(pkgs, pkgPath, idx)
      } else if(pkgPath == 'snap'){
        debug(pkg,'snap')
        await this.handleAptSnapItem(pkgs, pkgPath, idx)
      }
      idx++
    }
  }

  async runCommand(pkgs, pkgPath, idx){

    const cmd = Hoek.reach(pkgs, pkgPath+'.'+idx+'.script')
    debug('runCommand - ' , cmd, idx)

    let output
    const startTime = (new Date).toISOString()
    const actor = this.context.party.actor.idObj
    let endTime

    try {
      output = await ExecSh(cmd, true)
      endTime = (new Date).toISOString()
    } catch (e) {
      debug('Error: ', e);
      debug('Stderr: ', e.stderr);
      debug('Stdout: ', e.stdout);
      endTime = (new Date).toISOString()
      
      debug('creating console error log')
      let consoleLog = await this.context.party.createDocument('console_log', {
        owner: actor,
        context: {
          endTime,
          startTime,
          itemIdx: idx,
          module: 'roshubd.packages.'+pkgPath,
        },
        content: {
          error: {
            code: e.code,
            name: e.name,
            stack: e.stack,
            message: e.message,
            fileName: e.fileName,
            lineNumber: e.lineNumber,
            columnNumber: e.columnNumber
          },
          stdout: e.stdout,
          stderr: e.stderr
        }
      })

      await this.setStatus(pkgPath, idx, 'error', [consoleLog],true)
      throw e
    }


    let consoleLog = await this.context.party.createDocument('console_log', {
      owner: actor,
      context: {
        endTime,
        startTime,
        itemIdx:idx,
        module: 'roshubd.packages.'+pkgPath,
      },
      content: {
        stdout: output.stdout,
        stderr: output.stderr
      }
    })

    await this.setStatus(pkgPath, idx, 'success', [consoleLog], true)
  }

  async setStatus(pkgPath, index, status, outputs=[], end){
    debug('setting status', pkgPath, '[', index, '] =', status)
    let statusList = Hoek.reach(this.context, 'remote.status.data.modules.packages.'+pkgPath)

    if(!statusList){
      debug('creating list')

      let list = this.context.remote.config.module('packages.'+pkgPath)
      statusList = list.map((/*item, index*/)=>{
        return {state: 'idle'}
      })
    }

    const logs = outputs.map(out=>{return out.idObj})

    let startTime = ((!statusList[index] || !statusList[index].start) ? (new Date).toISOString() : statusList[index].start)
    statusList[index] = {
      start: startTime,
      end: (end==true ? (new Date).toISOString() : undefined),
      state: status,
      output: logs.length < 1 ? undefined : logs
    }

    deepSet(this.context.remote.status, 'data.modules.packages.'+pkgPath, statusList)
    await this.context.remote.status.save()
  }

  async handleAptSnapItem(pkgs, pkgPath, idx){
    debug('handleAptSnapItem')

    const actor = this.context.party.actor.idObj
    let startTime = (new Date).toISOString()

    const itemIdx = idx
    const item = Hoek.reach(pkgs, pkgPath+'.'+idx)

    let PktMgmt = undefined
    if(pkgPath == 'snap'){
      debug('handling snap item')
      PktMgmt = Snap
    } else {
      debug('handling apt item')
      PktMgmt = Apt
    }

    debug(item)
    await this.setStatus(pkgPath, idx, 'running')
    const showBefore = await PktMgmt.show(item.pkg)

    let showBeforeLog = await this.context.party.createDocument('console_log', {
      owner: actor,
      context: {
        endTime: (new Date).toISOString(),
        startTime,
        itemIdx,
        module: 'roshubd.packages.'+pkgPath,
      },
      content: showBefore
    })

    let action = undefined
    //debug('show-before', showBefore)

    try{
      switch(item.action){
        case 'install':
          //check if installed, if not install
          if(!showBefore || !showBefore.parsed){
            debug('package[', item.pkg, '] installing')
            action = await PktMgmt.install(item.pkg)
  
          } else {
            debug('package[', item.pkg, '] is already installed')
          }
          break
  
        case 'remove':
          //check if installed, if true uninstall
          if(!showBefore || !showBefore.parsed){
            debug('package[', item.pkg, '] not installed')
          }
          else{
            debug('package[', item.pkg, '] removing')
            action = await PktMgmt.uninstall(item.pkg)
            debug('uninstall value', action)
          }
          break
      }
    }
    catch(err){
      throw err
    }
    
    let endTime = (new Date).toISOString()
    const showAfter = await PktMgmt.show(item.pkg)
    
    debug('show-before', showBefore)
    debug('show-after', showAfter)
    
    let showAfterLog = await this.context.party.createDocument('console_log', {
      owner: actor,
      context: {
        endTime,
        startTime,
        itemIdx,
        module: 'roshubd.packages.'+pkgPath,
      },
      content: showAfter
    })

    let actionLog = await this.context.party.createDocument('console_log', {
      owner: actor,
      context: {
        endTime,
        startTime,
        itemIdx,
        module: 'roshubd.packages.'+pkgPath,
      },
      content: action
    })
    

    let logs = [showBeforeLog, actionLog, showAfterLog]
    await this.setStatus(pkgPath, idx, 'success', logs, true)
  }
}

module.exports = SyncPackages