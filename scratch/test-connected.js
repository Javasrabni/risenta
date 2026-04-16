const { WebSocket } = require('ws');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const encoding = require('lib0/encoding');

const wsClient = new WebSocket('ws://localhost:3000/api/write/collaboration/yjs/testDoc');

wsClient.on('open', () => {
  const doc = new Y.Doc();
  doc.getText('default').insert(0, "A");
  
  const update = Y.encodeStateAsUpdate(doc);
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, 0); // messageSync
  syncProtocol.writeUpdate(enc, update);
  
  console.log("Sending update...");
  wsClient.send(encoding.toUint8Array(enc));
});

wsClient.on('message', (msg) => {
  console.log("Client got message of length:", msg.length);
});

setTimeout(() => process.exit(0), 1000);
