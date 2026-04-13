'use client';

import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/collaboration';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let io: typeof import('socket.io-client').io | null = null;

async function getIO() {
  if (!io && typeof window !== 'undefined') {
    const socketIO = await import('socket.io-client');
    io = socketIO.io;
  }
  return io;
}

export function getSocket(headers?: Record<string, string>): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    // Trigger socket initialization
    fetch('/api/write/collaboration/socket', { headers }).catch(err => console.error('[Socket] Init error:', err));
    
    const ioClient = require('socket.io-client');
    socket = ioClient.io({
      path: '/api/write/collaboration/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket?.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket?.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket?.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket && typeof window !== 'undefined') {
    socket.disconnect();
    socket = null;
  }
}

export function joinDocument(
  documentId: string,
  userId: string,
  userType: string,
  userName: string
): void {
  const s = getSocket();
  if (s) s.emit('doc:join', { documentId, userId, userType, userName });
}

export function leaveDocument(documentId: string): void {
  const s = getSocket();
  if (s) s.emit('doc:leave', { documentId });
}

export function sendDocumentUpdate(documentId: string, update: Uint8Array): void {
  const s = getSocket();
  if (s) s.emit('doc:update', { documentId, update });
}

export function updateCursor(
  documentId: string,
  cursorPosition: { anchor: number; head: number }
): void {
  const s = getSocket();
  if (s) s.emit('cursor:update', { documentId, cursorPosition });
}

export function updateSelection(
  documentId: string,
  selection: { start: number; end: number; text?: string }
): void {
  const s = getSocket();
  if (s) s.emit('selection:update', { documentId, selection });
}
