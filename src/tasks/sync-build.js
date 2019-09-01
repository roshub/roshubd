
const Hoek = require('hoek')
const Path = require('path')
const rimraf = require('rimraf')
const debug = require('debug')('roshubd.sync-build')
const fs = require("fs")

const Task = require('../task')
const Shell = require('../utils/command')

const rosSetupPaths = [
  "/opt/ros/melodic/setup.sh",
  "/opt/ros/kinetic/setup.sh"
]

class RosDistro{
  constructor({distro, path, setup, workspace, env}){
    this.distro = distro
    this.path = path
    this.setup = setup
    this.workspace = workspace
    this.env = env
  }

  static fromPath(path, distro){

    const setupPath = Path.join(path, 'setup.sh')
    const rosInstallPath = Path.join(path, '.rosinstall')

    if (fs.existsSync(setupPath)){
      return new RosDistro({
        distro: distro,
        path: path,
        setup: setupPath
      })
    }

    return undefined
  }
}

class SyncBuild extends Task {
  constructor(roshubd){
    super({
      name: SyncBuild.type(), context: roshubd,
      depends: ['state.enrolled', 'tasks.sync-code']
    })

    this.on('failure', this.onFailure.bind(this))
    this.on('success', this.onSuccess.bind(this))
  }

  async onFailure(){
    debug('failure')
    debug(this.failure)
    //process.exit(0)
  }

  async onSuccess(){
    debug('success')
    //process.exit(0)
  }

  async exec(input){
    debug('exec')

    const info = this.context.remote.info
    const config = this.context.local.config

    const distros = await this.detectRosDistroPaths()

    debug('found', distros.length, ' ROS distros')

    if(distros.length < 1){
      debug('no ros distro available, can not build')
      debug(info)
      info.data.ros = []
      await info.save()
      throw 'install ros'
    }
    else {
      await info.mergeData({ ros: distros })
      await info.save()
    }
    

    const codeList = await this.context.remote.actor.getCodeDocumentList()
    if(!codeList || codeList.length < 1){
      debug('no code')
      return
    }

    await config.touchDir('build/catkin')
    if(!config.fileExists('/build/catkin/src/devel/setup.bash')){
      await this.createCatkinWorkspace()
    }
    
    
    
    debug(codeList)

    for(let code of codeList){
      debug(code.data.remoteUrl)

      await this.linkCatkinDir(code)
    }

    await this.buildCatkinDir()

    debug('done')
  }

  async buildCatkinDir(){
    debug('buildCatkinDir')

    const config = this.context.local.config
    let catkinPath = config.filePath('/build/catkin')
    await Shell.exec(`cd ${catkinPath}; . ./devel/setup.bash; catkin_make`, {shell: 'bash'})
  }

  async createCatkinWorkspace(){
    debug('createCatkinWorkspace')
    const config = this.context.local.config

    config.touchDir('/build/catkin/src')
    let srcPath = config.filePath('/build/catkin/src')
    let catkinPath = config.filePath('/build/catkin')
    //let opts = { cwd: config.filePath('/build/catkin/src') }
    let rosSetupPath = await this.findRosSetupFile()
    if (!rosSetupPath){
      throw Error("Cannot find ROS setup.bash, cannot create catkin workspace")
    }
    if(!config.fileExists('/build/catkin/src/CMakeLists.txt')){      
      await Shell.exec(`. ${rosSetupPath}; cd ${srcPath}; catkin_init_workspace`, {shell: 'bash'})
    }

    await Shell.exec(`. ${rosSetupPath}; cd ${catkinPath}; catkin_make`, {shell: 'bash'})
  }

  async linkCatkinDir(code){
    debug('linkCatkinDir')
    let config = this.context.local.config
    await config.linkFiles('code/'+code.id+'/', 'build/catkin/src/'+code.id)
  }


  

  async detectRosDistroPaths(){
    const DISTRO_NAMES = ['groovy', 'hydro', 'indigo', 'jade', 'kinetic', 'lunar', 'melodic', 'ardent', 'bouncy', 'crystal', 'dashing', 'eloquent']
    
    const distros = DISTRO_NAMES.map( name => {
      const path = '/opt/ros/'+name
      return RosDistro.fromPath(path)
    }).filter( distro => distro!==undefined )

    return distros
  }

  async findRosSetupFile(){
    let build_config = this.context.remote.config.module('build')
    let distro = build_config.catkin.distro;
    let data = this.context.remote.info.getData()

    //first check if ROS_PACKAGE_PATH is set. If not, go through hardcoded list.
    if (process.env.ROS_PACKAGE_PATH){
      if (fs.existsSync(process.env.ROS_PACKAGE_PATH + "/../setup.sh")){
        return process.env.ROS_PACKAGE_PATH + "/../setup.sh"
      }
    }
    let foundPaths = [];
    let chosenPath = null;

    for (filePath in rosSetupPaths) {
      if (fs.existsSync(filePath)){
        const filePathSplit = filePath.split('/')
        foundPaths.push({filePath : filePath, distro : filePathSplit[filePathSplit.length - 2]});

        if (foundPaths.length > 1){
          //check if distro setting is "auto"
          if (item.distro == "auto"){
            throw new Error("More than two ROS installations found and configured for 'auto'")
          }
        }

        if (foundPaths[foundPaths.length].distro == distro){
          chosenPath = foundPaths[foundPaths.length];
          break;
        }
      }
    }

    //if path hasn't been chosen
    if (!chosenPath){
      //if we found at least one and if distro is set to "auto" or isn't set
      if (foundPaths.length == 1 && (distro == "auto" || !distro)){
        chosenPath = foundPaths[0];
      } else if (foundPaths.length == 0){
        return null
      }
    }

    let foundRosInfo = false;
    //check if rosinfo already exists, and update it
    data.ros = data.ros.map((item, index, array)=>{
      if (item.distro == distro){
        item.path = chosenPath.filePath;
        foundRosInfo = true;
      }
      return item;
    })
    //if not, then create new ros info and push it
    if(!foundRosInfo){
      data.ros.push({
        distro: distro,
        path: chosenPath.filePath
      })
    }
    //save it
    this.context.remote.info.setData(data)
    this.context.remote.info.save();
    return chosenPath.filePath;
  }

  static type(){
    return 'tasks.sync-build'
  }
}

module.exports = SyncBuild