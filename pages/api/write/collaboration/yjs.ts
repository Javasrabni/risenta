import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import connectDB from '@/lib/mongodb';
import CollaborationSession from '@/app/models/collaborationSession';

type UpgradeHandler = (request: IncomingMessage, socket: Duplex, head: Buffer) => void;
type WsWithMeta = WebSocket & { isAlive?: boolean; sessionSocketId?: string };

type SharedDoc = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
  connControlledIds: Map<WebSocket, Set<number>>;
};

type ServerWithYjs = HttpServer & {
  yjsWss?: WebSocketServer;
  yjsUpgradeHandler?: UpgradeHandler;
  yjsDocs?: Map<string, SharedDoc>;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

// Heartbeat interval to detect stale connections
const HEARTBEAT_INTERVAL = 30000;

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    res.status(500).json({ ok: false, error: 'Socket server unavailable' });
    return;
  }
  const server = (res.socket as unknown as { server: ServerWithYjs }).server;

  if (!server.yjsWss) {
    server.yjsDocs = new Map();
    const wss = new WebSocketServer({ noServer: true });

    // Heartbeat timer to clean stale connections
    const heartbeatTimer = setInterval(() => {
      wss.clients.forEach((ws) => {
        const extWs = ws as WebSocket & { isAlive?: boolean };
        if (extWs.isAlive === false) {
          extWs.terminate();
          return;
        }
        extWs.isAlive = false;
        extWs.ping();
      });
    }, HEARTBEAT_INTERVAL);

    wss.on('close', () => {
      clearInterval(heartbeatTimer);
    });

    wss.on('connection', (conn, req) => {
      const extConn = conn as WsWithMeta;
      extConn.isAlive = true;
      extConn.on('pong', () => { extConn.isAlive = true; });

      const parsedUrl = new URL(req.url || '/api/write/collaboration/yjs/default', 'http://localhost');
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const yjsIdx = pathParts.lastIndexOf('yjs');
      const room = (yjsIdx >= 0 && pathParts[yjsIdx + 1]) || 'default';
      const uid = parsedUrl.searchParams.get('uid') || '';
      const uname = parsedUrl.searchParams.get('uname') || 'Anonymous';
      const utype = parsedUrl.searchParams.get('utype') || 'guest';
      const docs = server.yjsDocs!;
      let shared = docs.get(room);

      if (!shared) {
        const doc = new Y.Doc();
        const awareness = new awarenessProtocol.Awareness(doc);
        shared = {
          doc,
          awareness,
          conns: new Set(),
          connControlledIds: new Map(),
        };

        doc.on('update', (update: Uint8Array, origin: any) => {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0); // sync message type
          syncProtocol.writeUpdate(encoder, update);
          const message = encoding.toUint8Array(encoder);
          for (const client of shared!.conns) {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(message);
              } catch {
                // Ignore
              }
            }
          }
        });

        awareness.on(
          'update',
          (
            { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
            origin: unknown
          ) => {
            const changedClients = added.concat(updated, removed);
            if (origin && origin instanceof WebSocket) {
              const known = shared!.connControlledIds.get(origin) || new Set<number>();
              added.concat(updated).forEach((id) => known.add(id));
              removed.forEach((id) => known.delete(id));
              shared!.connControlledIds.set(origin, known);
            }

            const enc = encoding.createEncoder();
            encoding.writeVarUint(enc, 1); // awareness message type
            encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
            const payload = encoding.toUint8Array(enc);

            for (const client of shared!.conns) {
              if (client.readyState === WebSocket.OPEN) {
                try {
                  client.send(payload);
                } catch {
                  // Ignore send errors for stale connections
                }
              }
            }
          }
        );
        docs.set(room, shared);
      }

      shared.conns.add(conn);
      shared.connControlledIds.set(conn, new Set());
      extConn.sessionSocketId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // Track active users for collaborator panel (admin/customer only).
      if (uid && (utype === 'admin' || utype === 'customer')) {
        void connectDB().then(async () => {
          await CollaborationSession.findOneAndUpdate(
            { documentId: room, userId: uid, userType: utype, socketId: extConn.sessionSocketId },
            {
              $set: {
                userName: uname,
                userColor: '#2563eb',
                isActive: true,
                lastSeenAt: new Date(),
              },
              $setOnInsert: {
                joinedAt: new Date(),
              },
            },
            { upsert: true, new: true }
          );
        }).catch(() => undefined);
      }

      // Send sync step 1
      const syncStep1 = encoding.createEncoder();
      encoding.writeVarUint(syncStep1, 0); // sync message type
      syncProtocol.writeSyncStep1(syncStep1, shared.doc);
      conn.send(encoding.toUint8Array(syncStep1));

      // Send awareness snapshot to new client
      const awarenessStates = Array.from(shared.awareness.getStates().keys());
      if (awarenessStates.length > 0) {
        const awarenessSnapshot = encoding.createEncoder();
        encoding.writeVarUint(awarenessSnapshot, 1);
        encoding.writeVarUint8Array(
          awarenessSnapshot,
          awarenessProtocol.encodeAwarenessUpdate(shared.awareness, awarenessStates)
        );
        conn.send(encoding.toUint8Array(awarenessSnapshot));
      }

      conn.on('message', (message) => {
        try {
          let data: Uint8Array;
          if (message instanceof Uint8Array) {
            data = message;
          } else if (message instanceof Buffer) {
            data = new Uint8Array(message);
          } else if (message instanceof ArrayBuffer) {
            data = new Uint8Array(message);
          } else {
            return;
          }

          const decoder = decoding.createDecoder(data);
          const reply = encoding.createEncoder();

          while (decoding.hasContent(decoder)) {
            const type = decoding.readVarUint(decoder);
            
            // Type 0: Sync message
            if (type === 0) {
              if (uid && (utype === 'admin' || utype === 'customer') && extConn.sessionSocketId) {
                void CollaborationSession.updateOne(
                  { socketId: extConn.sessionSocketId },
                  { $set: { lastSeenAt: new Date(), isActive: true } }
                ).catch(() => undefined);
              }
              encoding.writeVarUint(reply, 0);
              syncProtocol.readSyncMessage(decoder, reply, shared!.doc, conn);
            }
            // Type 1: Awareness update
            else if (type === 1) {
              const awarenessUpdate = decoding.readVarUint8Array(decoder);
              awarenessProtocol.applyAwarenessUpdate(shared!.awareness, awarenessUpdate, conn);
            }
            // Type 3: Awareness query (request current state)
            else if (type === 3) {
              const states = Array.from(shared!.awareness.getStates().keys());
              if (states.length > 0) {
                encoding.writeVarUint(reply, 1);
                encoding.writeVarUint8Array(
                  reply,
                  awarenessProtocol.encodeAwarenessUpdate(shared!.awareness, states)
                );
              }
            } else {
              break; // Unknown type, abort buffer parsing
            }
          }

          if (encoding.length(reply) > 0) {
            conn.send(encoding.toUint8Array(reply));
          }
        } catch (err) {
          console.error('[Yjs WS] Message handling error:', err);
        }
      });

      conn.on('close', () => {
        const controlled = shared!.connControlledIds.get(conn);
        if (controlled && controlled.size > 0) {
          awarenessProtocol.removeAwarenessStates(shared!.awareness, Array.from(controlled), conn);
        }
        shared!.connControlledIds.delete(conn);
        shared!.conns.delete(conn);
        if (extConn.sessionSocketId) {
          void CollaborationSession.updateOne(
            { socketId: extConn.sessionSocketId },
            { $set: { isActive: false, lastSeenAt: new Date() } }
          ).catch(() => undefined);
        }

        // Garbage collect empty rooms after a delay
        if (shared!.conns.size === 0) {
          setTimeout(() => {
            // Re-check after delay in case someone reconnected
            if (shared!.conns.size === 0) {
              shared!.awareness.destroy();
              shared!.doc.destroy();
              docs.delete(room);
            }
          }, 30000); // Keep room alive for 30s after last disconnect
        }
      });

      conn.on('error', (err) => {
        console.error('[Yjs WS] Connection error:', err);
      });
    });

    const upgradeHandler: UpgradeHandler = (request, socket, head) => {
      if (!request.url?.startsWith('/api/write/collaboration/yjs')) return;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    };

    server.on('upgrade', upgradeHandler);
    server.yjsWss = wss;
    server.yjsUpgradeHandler = upgradeHandler;
  }

  res.status(200).json({ ok: true });
}
