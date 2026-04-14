import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from "mongoose";
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket } from 'socket.io';
import * as Y from 'yjs';
import connectDB from '@/lib/mongodb';
import Document from '@/app/models/document';
import CollaborationSession from '@/app/models/collaborationSession';
import DocumentVersion from '@/app/models/documentVersion';
import { ClientToServerEvents, ServerToClientEvents, getUserColor } from '@/types/collaboration';

export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory Yjs documents cache
const yDocs = new Map<string, Y.Doc>();
const userCounters = new Map<string, number>();

function getYDoc(documentId: string): Y.Doc {
  if (!yDocs.has(documentId)) {
    const ydoc = new Y.Doc();
    yDocs.set(documentId, ydoc);
    ydoc.getText('content');
    
    const saveInterval = setInterval(async () => {
      try {
        await connectDB();
        const update = Y.encodeStateAsUpdate(ydoc);
        await Document.findByIdAndUpdate(documentId, {
          yjsState: Buffer.from(update),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error('[Yjs] Auto-save error:', error);
      }
    }, 5000);
    
    ydoc.on('destroy', () => {
      clearInterval(saveInterval);
      yDocs.delete(documentId);
    });
  }
  return yDocs.get(documentId)!;
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  // @ts-ignore
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  // @ts-ignore
  const httpServer: NetServer = res.socket.server;
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: '/api/write/collaboration/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  
  // @ts-ignore
  res.socket.server.io = io;

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('[Socket] Client connected:', socket.id);
    
    socket.on('doc:join', async (data) => {
      const { documentId, userId, userType, userName } = data;
      console.log(`[Socket] User ${userName} joining doc ${documentId}`);
      
      try {
        await connectDB();
        
        // Validate documentId
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
          socket.emit('error', { message: 'Invalid document ID', code: 'INVALID_DOC_ID' });
          return;
        }

        const doc = await Document.findById(documentId);
        if (!doc) {
          socket.emit('error', { message: 'Document not found', code: 'DOC_NOT_FOUND' });
          return;
        }

        socket.join(`doc:${documentId}`);
        
        // Setup session
        const counter = (userCounters.get(documentId) || 0) + 1;
        userCounters.set(documentId, counter);
        const userColor = getUserColor(counter);
        
        await CollaborationSession.findOneAndUpdate(
          { documentId, userId, userType },
          { socketId: socket.id, userName, userColor, isActive: true, lastSeenAt: new Date() },
          { upsert: true, new: true }
        );

        const ydoc = getYDoc(documentId);
        const stateUpdate = Y.encodeStateAsUpdate(ydoc);
        
        const activeSessions = await CollaborationSession.find({ documentId, isActive: true }).lean();
        const usersList = activeSessions.map(s => ({
          userId: s.userId,
          userType: s.userType,
          userName: s.userName,
          userColor: s.userColor,
          socketId: s.socketId,
          isOnline: true
        }));

        (socket as any).emit('doc:sync', {
          documentId,
          update: stateUpdate,
          initialContent: doc.content,
          users: usersList
        });

        (socket as any).to(`doc:${documentId}`).emit('user:joined', {
          userId,
          userType,
          userName,
          userColor,
          socketId: socket.id
        });

        (socket as any).emit('users:list', {
          documentId,
          users: usersList
        });

      } catch (err) {
        console.error('[Socket] Join error:', err);
      }
    });

    socket.on('doc:update', ({ documentId, update }) => {
      const ydoc = getYDoc(documentId);
      Y.applyUpdate(ydoc, new Uint8Array(update));
      (socket as any).to(`doc:${documentId}`).emit('doc:update', { documentId, update });
    });

    socket.on('cursor:update', async ({ documentId, cursorPosition }) => {
      try {
        const session = await CollaborationSession.findOne({ socketId: socket.id }).lean();
        if (session) {
          (socket as any).to(`doc:${documentId}`).emit('cursor:update', { 
            userId: session.userId,
            userName: session.userName,
            userColor: session.userColor,
            socketId: socket.id,
            cursorPosition 
          });
        }
      } catch (err) {
        console.error('[Socket] Cursor update error:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log('[Socket] Client disconnected:', socket.id);
      const session = await CollaborationSession.findOneAndUpdate(
        { socketId: socket.id },
        { isActive: false, lastSeenAt: new Date() },
        { new: true }
      );
      if (session) {
        (socket as any).to(`doc:${session.documentId}`).emit('user:left', {
          userId: session.userId,
          userType: session.userType
        });
      }
    });
  });

  res.end();
};

export default SocketHandler;
