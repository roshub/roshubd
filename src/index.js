'use strict'

const Roshubd = require('./roshubd')
const debug = require('debug')('main')

let roshubd

async function main(){
  debug('*** starting roshubd ***')
  roshubd = new Roshubd()
  return roshubd.start()
}

process.on('exit', async function() {
  console.log('cleanup')
  return roshubd.stop().then(()=>{
    process.exit(0)
  }).catch(()=>{
    process.exit(2)
  })
})

process.on('SIGINT', async function() {
  console.log('Ctrl-C...')
  return roshubd.stop().then(()=>{
    process.exit(0)
  }).catch(()=>{
    process.exit(2)
  })
})


// Run main
main().catch((error) => {
  console.error(error)
  process.exit()
})