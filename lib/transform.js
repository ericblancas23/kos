'use strict';

const Transform = require('stream').Transform
const KineticState = require('./state')

// declared as var so it can be modified
var KineticObject = require('./object')

function contains(key) {
  return this.some(test)
  function test(x) {
	if (x !== key) {
	  return key.match('^'+x+'$') != null
	}
	return true
  }
}

class KineticTransform extends Transform {

  static get Object() { return KineticObject }
  static set Object(x) { KineticObject = x }

  constructor(options={}) {
    super({ objectMode: true })

    this.state = new KineticState(options.state)
    this.state.parent = this

    this._inputs  = new Set(options.inputs)
    this._outputs = new Set(options.outputs)
    this._ignores = new Set(options.ignores)

	this.upstreams = new Set()
	this.downstreams = new Set()
  }

  // Kinetic Transform Implementation
  // default behavior is to passthrough for matching inputs
  //
  // NOTE: MUST BE SUBCLASSED, otherwise MAY cause infinite loop
  _transform(chunk, enc, callback) {
    if (!(chunk instanceof KineticObject))
      return callback(new Error("chunk is not a KineticObject"))
	if (!contains.call(this.ignores, chunk.key) &&
		contains.call(this.inputs, chunk.key)) {
	  callback(null, chunk)
	} else {
	  callback()
	}
  }

  in(...keys) {
	for (let key of keys) this._inputs.add(key)
    return this
  }

  out(...keys) {
	for (let key of keys) this._outputs.add(key)
    return this
  }

  // Convenience function for injecting KineticObject into Readable stream
  send(key, value) {
	if (!contains.call(this.outputs, key))
      throw new Error("[KineticTransform:send] "+key+" not in ["+this.outputs+"]")
	return this.push(new KineticTransform.Object(key, value))
  }

  // Convenience function for injecting KineticObject into Writable stream
  feed(key, value) {
	return this.write(new KineticTransform.Object(key, value))
  }

  // Overload default pipe implementation
  pipe(stream) {
	if (stream instanceof KineticTransform) {
	  if (!this.isChainable(stream))
		throw new Error("[KineticTransform:pipe] cannot pipe to an incompatible stream")
	  this.downstreams.add(stream)
	  stream.upstreams.add(this)
	}
	return super.pipe(stream)
  }

  isChainable(stream) {
	if (!(stream instanceof KineticTransform)) return false
	return this.outputs.filter(x => stream.inputs.includes(x)).length > 0
  }

  // Advanced Usage (typically used for troubleshooting)
  //
  // enable/disable handling of specified key(s)
  disable(...keys) {
	for (let key of keys) this._ignores.add(key)
    return this
  }
  enable(...keys) {
	for (let key of keys) this._ignores.delete(key)
    return this
  }

  get inputs()  { return Array.from(this._inputs) }
  get outputs() { return Array.from(this._outputs) }
  get ignores() { return Array.from(this._ignores) }

  inspect() {
	return {
      inputs: this.inputs,
      outputs: this.outputs,
	  ignores: this.ignores,
      state: this.state
	}
  }
}

module.exports = KineticTransform