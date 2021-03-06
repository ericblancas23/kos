'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')
const KineticToken = require('./token')

const proto = module.exports = {
  get(...keys) {
    const { state } = this
    let res = keys.map(key => this.trigger.get(key))
    return res.length > 1 ? res : res[0]
  },

  send(key, ...values) {
    // if already flushed, then send it as we observe them
    if (this.queue.flushed === true) return this.trigger.send(...arguments)
    // check if key is part of allowed outputs
    if (!KineticToken.prototype.match.call({key}, this.outputs))
      throw new Error("["+this.identity+":context:send] "+key+" not in outputs["+this.outputs+"]")
    // preserve the send queue inside this context
    debug(this.id, 'queue', key)
    // preserve an instance of the token inside state machine
    this.queue.has(key) || this.queue.set(key, new KineticToken(key, this.id))
    this.queue.get(key).add(...values)
  },

  flush() {
    for (let [ key, token ] of this.queue) {
      debug(this.id, `flushing ${key} (${token.length})`)
      this.trigger.push(token.compress())
      this.queue.delete(key)
    }
    this.queue.flushed = true
  }
}

delegate(proto, 'trigger')
  .getter('id')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .getter('reactor')
  .getter('parent')
  .method('feed') // for self-driven trigger
  .method('seen')
  // state facilities
  .method('has')
  .method('set')
  .method('delete')
  .method('reset')
  // various logging facilities
  .method('debug')
  .method('info')
  .method('warn')
  .method('error')
  .method('throw')

delegate(proto, 'reactor')
  .method('save')
