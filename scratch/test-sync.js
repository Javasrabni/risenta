const Y = require('yjs')
const syncProtocol = require('y-protocols/sync')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')

const doc = new Y.Doc()
const syncStep1 = encoding.createEncoder()
encoding.writeVarUint(syncStep1, 0)
syncProtocol.writeSyncStep1(syncStep1, doc)

const payload = encoding.toUint8Array(syncStep1)

console.log("Payload len:", payload.length, payload)

// Emulate read on client side:
const decoder = decoding.createDecoder(payload)
const reply = encoding.createEncoder()
const type = decoding.readVarUint(decoder)
console.log("Type:", type)
if (type === 0) {
  syncProtocol.readSyncMessage(decoder, reply, doc, 'test')
  console.log("Reply length:", encoding.length(reply))
}
