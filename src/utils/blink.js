const exec = require('child_process').exec;

const CMD = ((process.env.SNAP)
              ? '$SNAP/usr/local/bin/blink1-tool'
              : 'sudo $HOME/.bin/blink1-tool')

let nextCommand = undefined
let child = undefined
let stopped = false

const runCmd = async function(cmd){
  return new Promise((resolve,reject)=>{

    child = exec(cmd, (err, stdout, stderr)=>{

      if(err){
        err.stdout = stdout
        err.stderr = stderr
        return reject(err)
      }

      return resolve({ stdout, stderr })
    })

  })
}

exports.setColor = async function(color){
  runCmd(CMD+' --'+color).catch(err=>{})
}


exports.glimmer = async function(color, count='0'){
  runCmd(CMD+' --'+color+' --glimmer='+count).catch(err=>{})
}