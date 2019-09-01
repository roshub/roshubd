const Debug = require('debug')
const MongoUuid = require('uuid-mongodb')


class ClientSession {
  constructor({source, comms, client}){
    this.id = MongoUuid.v4().toString()

    this.source = source
    this.comms = comms
    this.client = client
    this.debug = Debug('roshubd.client-context.' + this.id)

    this.debug( 'new session - source =', this.source, ' client =', this.client )
  }

}

module.exports = ClientSession