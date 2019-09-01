
const Hoek = require('hoek')
const rimraf = require('rimraf')
const debug = require('debug')('roshubd.sync-code')


const Task = require('../task')
const Shell = require('../utils/command')


class SyncCode extends Task {
  constructor(roshubd){
    super({
      name: SyncCode.type(), context: roshubd,
      depends: ['state.enrolled', 'tasks.sync-packages']
    })

    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
  }

  async onFailure(){
    debug('failure')
    debug(this.failure)
  }

  async onSuccess(){
    debug('success')
  }

  async exec(input){
    debug('exec')

    await Promise.all([
      this.context.local.config.touchDir('ssh'),
      this.context.local.config.touchDir('code'),
      this.context.local.config.touchDir('build/catkin')
    ])
    
    const codeList = await this.context.remote.actor.getCodeDocumentList()

    debug(codeList)

    for(let code of codeList){

      let status = await code.status()
      let key = await code.deployKey()

      debug(code.data.remoteUrl)
      debug(code.data.cloud)
      debug('status info', status.data)
      debug('deploy key', key)

      if(Hoek.reach(code, 'data.remoteUrl',{default:''}).indexOf('https') < 0){
        //! create ssh key for private repo deploy key
        await this.createSshKey(code)
        await this.deploySshKey(code)
      }
      
      await this.pullGit(code, status)
    }

    return true
  }

  async createSshKey(code){
    debug('createSshKey')
    const config = this.context.local.config

    const path = '/ssh/'+code.id

    if(config.fileExists(path) && config.fileExists(path+'.pub')){ 
      debug('\t',path,'- already generated')
      return
    }
    
    await Shell.exec('ssh-keygen -t ecdsa -N "" -f '+ config.filePath(path))
  }

  async readSshKey(code){
    debug('readSshKey')
    const config = this.context.local.config
    const path = '/ssh/'+code.id+'.pub'
    return config.readFile(path)
  }

  async deploySshKey(code){
    debug('deploy key')

    const remoteKey = await code.deployKey()
    debug('loaded remote')
    const key = await this.readSshKey(code)
    debug('loaded local')

    debug('\tdeploySshKey code', code.id, 'public - ', key )
    debug('\t\t remote key -', remoteKey)

    if(Hoek.reach(remoteKey, 'data.key') == key){
      debug('key already installed')
      return
    }

    await code.createDeployKey(key)
  }

  async cloneGit(code){
    debug('cloneGit -', code.data.remoteUrl, code.id)
    const config = this.context.local.config
    const keyPath = config.filePath('/key/'+code.id)
    const repoPath = config.filePath('/code/')
    const codePath = config.filePath('/code/'+code.id)

    config.touchDir('/code')
    let opts = {
      cwd: repoPath,
      env:{  GIT_SSH_COMMAND: 'ssh -i '+keyPath }
    }

    return Shell.exec('git clone '+code.data.remoteUrl+' '+code.id, opts)
  }

  async pullGit(code, status){
    debug('pullGit -', code.data.remoteUrl, code.id)
    const config = this.context.local.config
    const keyPath = config.filePath('/key/'+code.id)
    const repoPath = config.filePath('/code/')
    const codePath = config.filePath('/code/'+code.id)

    const target = Hoek.reach(code.data, 'update.target')
    const strategy = Hoek.reach(code.data, 'update.strategy')

    let opts = {
      cwd: codePath,
      env:{  GIT_SSH_COMMAND: 'ssh -i '+keyPath }
    }

    if(!config.fileExists('/code/'+code.id+'/.git/HEAD')){
      await this.cloneGit(code)
    }

    debug((await Shell.exec('git fetch origin', opts)).stdout)
    debug((await Shell.exec('git checkout '+target, opts)).stdout)
    debug((await Shell.exec('git pull origin '+target, opts)).stdout)
  }

  static type(){
    return 'tasks.sync-code'
  }
}

module.exports = SyncCode