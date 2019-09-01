const OS = require('os')
const debug = require('debug')('roshubd.comms.network-wifi')

const Task = require('../task')

var WifiControl = require('../utils/wifi/wifi-control')

class NetworkWifiTask extends Task {
  constructor(roshubd){
    super({name: NetworkWifiTask.type(), context: roshubd, background: true})

    this.control = WifiControl
    this.status = {
      iface: null,
      state: null,
      scan: null
    }
  }
  
  async stop(){
    //
  }

  async updateStatus(){
    this.status.state = this.control.getIfaceState()
    debug(this.status.state)

    if (!this.status.state.power){
      debug('reset wifi')
      await this.resetWiFi()
      debug('reset complete')
      this.status.state = this.control.getIfaceState()
      debug(this.status.state)
      await this.scanForWiFi()
    } else {
      await this.scanForWiFi()
    }

    this.emit('status', this)
    return this.status
  }

  async connectToAP(apName){
    debug('connectToAp - ', apName)

    return new Promise((resolve, reject)=>{
      this.control.connectToAP(apName, (err, res)=>{
        if(err){ return reject(new Error(err)) }
        resolve(res)
      })
    })
  }

  async resetWiFi(){
    debug('resetWiFi')

    return new Promise((resolve, reject)=>{
      this.control.resetWiFi(()=>{
        //if(err){ return reject(new Error(err)) }
        resolve()
      })
    })
  }


  async scanForWiFi(){
    debug('scanForWiFi')

    return new Promise((resolve, reject)=>{
      this.control.scanForWiFi((err, res)=>{
        if(err){ return reject(new Error(err)) }

        debug('onScan -',res.msg)
        this.status.scan = res
        this.emit('scan', this)
        return resolve(res)
      })
    })
  }


  async exec(){
    this.status.iface = this.control.findInterface()
    debug('default iface = ', this.status.iface)
    this.control.init({ debug: true, iface: this.status.iface.interface })

    await this.updateStatus()

    return this.detach()
  }

  static type(){
    return 'comms.network-wifi'
  }
}

module.exports = NetworkWifiTask