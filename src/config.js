'use strict';

const fs = require('fs')
const os = require('os')
const Path = require('path')
const nconf = require('nconf')
const touch = require('touch')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const sanitize = require('sanitize-filename')

const logger = require('debug')('roshubd.config');

var BASE_PATH = process.env.SNAP_COMMON || ((process.env.HOME) ? (process.env.HOME + '/.roshubd') : '.' )

class Config {

  constructor(defaults, whitelist){
    this.whitelist = whitelist || [
      
    ]
    defaults = defaults || {}
    this.basePath = defaults.basePath || BASE_PATH
    this.defaults = defaults || {}
    this.defaults.logicalSeparator = '.'
  }

  open () {
    this.touchDir('')
    let file_name = 'config.json'
    nconf.argv()
    const config_file = nconf.get('config')
    if (config_file){
      const file_path = Path.parse(config_file)
      file_name = file_path.base
      if (!Path.isAbsolute(config_file)){
        this.basePath = process.cwd() + '/' + file_path.dir
      } else {
        this.basePath = file_path.dir
      }
    }
    nconf.file({
      file: file_name,
      dir: this.basePath,
      search: true,
      logicalSeparator: '.'
    })
    nconf.env({
      logicalSeparator: '.'
      //whitelist: this.whitelist,
    })

    //logger(`config ready: ${this.basePath}${file_name}`)
    return this
  }

  static config(defaults, whitelist){
    let c = new Config(defaults, whitelist)
    c.open()

    return c
  }

  readAll(){
    return nconf.get();
  }

  storageAdapter(){
    return {
      setItem: function(key, value){
        this.write(key, value)
      }.bind(this),
      getItem: function(key){
        return this.read(key)
      }.bind(this)
    }
  }
  
  // Read config file as json
  read(key){
    logger('reading path: ' + key)
    let val = nconf.get(key)

    //logger(key+ ' = ', val)    

    return val
  }

  write(key, data, cb){
    return Promise((resolve,reject)=>{
      logger('setting key: ' + key.replace('.', ':'))
      if(!nconf.set(key.replace('.', ':'), data)){
        return reject()
      }

      nconf.save((err)=>{
        if(err){ return reject(err) }

        return resolve()
      })
    })
  }


  exists(key){
    return (read(key) !== undefined)
  }

  /*
  * cb - (err, data)
  */
  readFile(path, cb){
    var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))

    logger("Reading from file: " + realPath)
    fs.readFile(realPath, 'utf8', cb)
  }

  /*
  * cb - (err)
  */
  writeFile(path, data, cb){
    if(!this.fileExists(path)){
      this.touchFile(path, (p)=>{
        var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))
        logger("Writing to file: " + realPath)
        fs.writeFile(realPath, data, null, cb)
      })
    }
    else{
      var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))
      logger("Writing to file: " + realPath)
      fs.writeFile(realPath, data, null, cb)
    }
  }

  fileExists(path){
    var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))

    return fs.existsSync(realPath)
  }

  /*
    cb - (path)
  */
  touchFile(path, cb){
    mkdirp(this.basePath+"/" + Path.dirname(path), (err)=>{
      if(err){
        logger("mkdirp failed:" + err);
      }

      touch(this.basePath+"/" + Path.dirname(path) + '/'+ sanitize(Path.basename(path)), null, ()=>{
        cb(Path.dirname(path) + '/' + sanitize(Path.basename(path)))
      });
    })
  }

  touchDir (path) {
    return new Promise((resolve, reject) => {
      const basedPath = Path.join(this.basePath, path)
      mkdirp(basedPath, (error) => {
        if (error) {
          logger(`failed to mkdirp '${basedPath}':`, error)
          return reject(error)
        }

        // resolve to adjusted path on success
        resolve(basedPath)
      })
    })
  }

  rmDir(path){
    return new Promise((resolve, reject)=>{
      let resolvedPath = this.basePath +'/'+ sanitize(Path.basename(path))
      logger('rmDir ' + resolvedPath)
      rimraf(resolvedPath, (err)=>{
        if(err){
          logger("rmdir failed:" + err);
          return reject(err)
        }

        resolve()
      })
    })
  }

  rmFile(path){
    return new Promise((resolve, reject)=>{
      let resolvedPath = this.basePath +'/'+ Path.dirname(path) + '/'+ sanitize(Path.basename(path))
      logger('rmFile ' + resolvedPath)
      fs.unlink(resolvedPath, (err)=>{
        if(err){
          logger("unlink failed:" + err);
          return reject(err)
        }

        resolve()
      })
    })
  }

  filePath(path){
    return this.basePath+"/" + Path.dirname(path) + '/'+ sanitize(Path.basename(path))
  }

  save(){
    return new Promise((resolve,reject)=>{
      nconf.save((err)=>{
        if(err){logger(err); return reject(err)}

        logger('saved')
        resolve()
      })
    })
  }
}



module.exports = Config