const { WebSocketServer, WebSocket } = require('ws');
const Y = require('yjs');
const awarenessProtocol = require('y-protocols/awareness');
const syncProtocol = require('y-protocols/sync');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');

const wss = new WebSocketServer({ port: 8089 });

const doc = new Y.Doc();
const awareness = new awarenessProtocol.Awareness(doc);
const conns = new Set();

doc.on('update', (update) => {
  console.log("Server Doc Update generated", update.length);
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0);
  syncProtocol.writeUpdate(encoder, update);
  const payload = encoding.toUint8Array(encoder);
  
  for (const client of conns) {
    if (client.readyState === 1) client.send(payload);
  }
});

awareness.on('update', ({ added, updated, removed }) => {
  console.log("Server Awareness Update generated");
  const changedClients = added.concat(updated, removed);
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, 1);
  encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
  const payload = encoding.toUint8Array(enc);
  
  for (const client of conns) {
    if (client.readyState === 1) client.send(payload);
  }
});

wss.on('connection', (conn) => {
  console.log("Server received connection");
  conns.add(conn);
  
  const syncStep1 = encoding.createEncoder();
  encoding.writeVarUint(syncStep1, 0);
  syncProtocol.writeSyncStep1(syncStep1, doc);
  conn.send(encoding.toUint8Array(syncStep1));

  conn.on('message', (message) => {
    console.log("Server received message from client!");
    const data = new Uint8Array(message);
    const decoder = decoding.createDecoder(data);
    
    while (decoding.hasContent(decoder)) {
      const type = decoding.readVarUint(decoder);
      if (type === 0) {
        console.log("Server: Sync message");
        const reply = encoding.createEncoder();
        encoding.writeVarUint(reply, 0);
        syncProtocol.readSyncMessage(decoder, reply, doc, conn);
        if (encoding.length(reply) > 1) {
          conn.send(encoding.toUint8Array(reply));
        }
      } else if (type === 1) {
        console.log("Server: Awareness message");
        const awarenessUpdate = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, awarenessUpdate, conn);
      }
    }
  });
});

setTimeout(() => {
  const wsClient = new WebSocket('ws://localhost:8089');
  wsClient.on('open', () => {
    console.log("Client connected");
    // Emulate sending an awareness update
    const clientDoc = new Y.Doc();
    const clientAwareness = new awarenessProtocol.Awareness(clientDoc);
    clientAwareness.setLocalStateField('user', { name: "TestUser" });
    
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, 1);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(clientAwareness, [clientDoc.clientID]));
    wsClient.send(encoding.toUint8Array(enc));
  });
  
  wsClient.on('message', (msg) => {
    console.log("Client received message length:", msg.length);
  });
}, 500);

setTimeout(() => process.exit(0), 1000);
