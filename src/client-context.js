
class ClientContext {
  constructor({request, session}){
    this.request = request
    this.reply = undefined
    this.party = undefined
    this.session = session
    this.manager = undefined
  }

  setParty(party){
    this.party = party
  }

  setReply(reply){
    this.reply = reply
  }

  setManager(manager){
    this.manager = manager
  }

  async send(reply){
    if(reply){ this.reply = reply }

    if(this.session && this.session.comms){
      return await this.session.comms.send(this.reply)
    }
  }

  async debug(msg, ...args){
    let line = ((new Error().stack).split('at ')[2]).trim()

    const openParen = line.indexOf('(') + 1
    const closeParen = line.indexOf(')')

    const filePath = line.substring(openParen, closeParen).replace(__dirname, '')
    line = filePath

    const newMsg = line + ' ' + msg
    this.session.debug(newMsg, ...args)
  }
}

module.exports = ClientContext