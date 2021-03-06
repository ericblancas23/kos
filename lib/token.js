'use strict';

const CircularJSON = require('circular-json')

class KineticToken extends Array {

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must define label and argument')
    let [ key, origin ] = label.split('|')
    obj = CircularJSON.parse(obj)
    return new KineticToken(key, origin).add(obj)
  }

  constructor(key, origin='unknown') {
    super()
    this.key = key
    this.origin = origin
	this.tags = new Map
    this.tags.set(origin)
  }

  add() {
    this.push(...arguments)
    return this
  }

  compress() {
    if (this.length > 1) {
      let uniques = [ ...new Set(this) ]
      if (this.length !== uniques.length) {
        this.splice(0, this.length, ...uniques)
      }
    }
    return this
  }

  tag(key, val) { 
	key && this.tags.set(key, val) 
	return this
  }

  match(keys) {
    if (!arguments.length) return null
    if (arguments.length > 1) keys = arguments
    if (typeof keys === 'string') keys = [ keys ]
    //if (keys instanceof Set && keys.has(this.key)) return true
    let idx = -1
    for (let key of keys) {
      idx++
      if (this.key === key) return [ idx, key ]
      if (!key || key.indexOf('*') === -1) continue
      let regex = '^'+key.replace('*','.*')+'$'
      if (this.key.match(regex) != null)
        return [ idx, key ]
    }
    return null
  }

  toKSON() {
    let { key, origin } = this
    let label = `${key}|${origin}`
    return this.map(value => label+' '+CircularJSON.stringify(value)).join("\n")
  }

  toJSON() {
    let { key, value } = this
    if (typeof value === 'function') value = null
    return '{"' + key + '":' + CircularJSON.stringify(value) + '}'
  }
  
  get value() { return this[this.length - 1] }
  get accepted() {
    for (let x of this.tags.values()) {
      if (x) return true
    }
    return false
  }
}

module.exports = KineticToken
