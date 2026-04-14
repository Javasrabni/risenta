/* eslint-disable no-console */
import { io } from 'socket.io-client';

const target = process.env.LOADTEST_URL || 'http://localhost:3000';
const documentId = process.env.LOADTEST_DOC_ID || '';
const clients = Number(process.env.LOADTEST_CLIENTS || 10);
const durationMs = Number(process.env.LOADTEST_DURATION_MS || 30000);

if (!documentId) {
  console.error('Missing LOADTEST_DOC_ID');
  process.exit(1);
}

const sockets = Array.from({ length: clients }, () =>
  io(target, {
    path: '/api/write/collaboration/socket',
    transports: ['websocket'],
  })
);

let updatesSent = 0;
let updatesReceived = 0;
const started = Date.now();

sockets.forEach((socket, index) => {
  socket.on('connect', () => {
    socket.emit('doc:join', { documentId });
    const timer = setInterval(() => {
      const payload = new Uint8Array([index, Date.now() % 255]);
      socket.emit('doc:update', { documentId, update: Array.from(payload) });
      updatesSent += 1;
    }, 250);
    setTimeout(() => clearInterval(timer), durationMs);
  });

  socket.on('doc:update', () => {
    updatesReceived += 1;
  });
});

setTimeout(() => {
  const elapsed = Date.now() - started;
  console.log({
    clients,
    elapsed,
    updatesSent,
    updatesReceived,
    updatesPerSecond: Number((updatesSent / (elapsed / 1000)).toFixed(2)),
  });
  sockets.forEach((s) => s.disconnect());
  process.exit(0);
}, durationMs + 1000);
