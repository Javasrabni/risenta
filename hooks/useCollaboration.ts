'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs';
import { getSocket, joinDocument, leaveDocument, sendDocumentUpdate } from '@/lib/socketClient';
import { Collaborator, CollaborationSession, CollaborationSettings } from '@/types/collaboration';
import { Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/collaboration';

interface UseCollaborationProps {
  documentId: string;
  userId: string;
  userType: string;
  userName: string;
  enabled: boolean;
}

interface UseCollaborationReturn {
  isConnected: boolean;
  collaborators: Collaborator[];
  activeUsers: CollaborationSession[];
  settings: CollaborationSettings | null;
  myRole: string;
  isOwner: boolean;
  yDoc: Doc | null;
  connect: () => void;
  disconnect: () => void;
  inviteUser: (email: string, role: string) => Promise<boolean>;
  removeCollaborator: (collaboratorId: string) => Promise<boolean>;
  updateCollaboratorRole: (collaboratorId: string, role: string) => Promise<boolean>;
  updateSettings: (settings: Partial<CollaborationSettings>) => Promise<boolean>;
  refreshCollaborators: () => Promise<void>;
}

export function useCollaboration({
  documentId,
  userId,
  userType,
  userName,
  enabled,
}: UseCollaborationProps): UseCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeUsers, setActiveUsers] = useState<CollaborationSession[]>([]);
  const [settings, setSettings] = useState<CollaborationSettings | null>(null);
  const [myRole, setMyRole] = useState<string>('viewer');
  const [isOwner, setIsOwner] = useState(false);
  
  const yDocRef = useRef<Doc | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const isJoinedRef = useRef(false);
  
  // Initialize Yjs document
  useEffect(() => {
    if (!enabled) return;
    
    yDocRef.current = new Doc();
    const ytext = yDocRef.current.getText('content');
    
    // Listen for local changes
    ytext.observe(() => {
      if (isJoinedRef.current && yDocRef.current) {
        const update = encodeStateAsUpdate(yDocRef.current);
        sendDocumentUpdate(documentId, update);
      }
    });
    
    return () => {
      yDocRef.current?.destroy();
      yDocRef.current = null;
    };
  }, [documentId, enabled]);
  
  // Setup socket connection
  useEffect(() => {
    if (!enabled) return;
    
    const socketHeaders: Record<string, string> = {};
    if (userType === 'guest') {
      socketHeaders['x-guest-id'] = userId;
      socketHeaders['x-guest-name'] = userName;
    }

    const socket = getSocket(socketHeaders);
    socketRef.current = socket;
    
    if (!socket) {
      console.warn('[useCollaboration] Socket not available');
      return;
    }
    
    // Socket event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      if (!isJoinedRef.current) {
        joinDocument(documentId, userId, userType, userName);
        isJoinedRef.current = true;
      }
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
      isJoinedRef.current = false;
    });
    
    socket.on('doc:sync', (data) => {
      // Initialize Yjs document with server state
      if (yDocRef.current) {
        const ytext = yDocRef.current.getText('content');
        if (ytext.length === 0 && data.initialContent) {
          ytext.insert(0, data.initialContent);
        }
        
        // Apply YJS update if present
        if (data.update) {
          applyUpdate(yDocRef.current, new Uint8Array(data.update));
        }
      }
      setActiveUsers(data.users || []);
    });
    
    socket.on('doc:update', (data) => {
      // Apply remote update to Yjs document
      const update = data.update || data;
      if (yDocRef.current && update) {
        applyUpdate(yDocRef.current, new Uint8Array(update));
      }
    });
    
    socket.on('user:joined', (user) => {
      setActiveUsers((prev) => [...prev.filter(u => u.userId !== user.userId), user]);
    });
    
    socket.on('user:left', (userId) => {
      setActiveUsers((prev) => prev.filter(u => u.userId !== userId));
    });
    
    socket.on('cursor:update', (data) => {
      setActiveUsers((prev) =>
        prev.map((u) =>
          u.userId === data.userId ? { ...u, cursorPosition: data.cursorPosition, userName: data.userName, userColor: data.userColor } : u
        )
      );
    });
    
    socket.on('selection:updated', (data) => {
      setActiveUsers((prev) =>
        prev.map((u) =>
          u.userId === data.userId ? { ...u, selection: data.selection } : u
        )
      );
    });
    
    socket.on('error', (error) => {
      console.error('[Collaboration] Socket error:', error);
    });
    
    // Initial connection
    if (socket.connected) {
      setIsConnected(true);
      joinDocument(documentId, userId, userType, userName);
      isJoinedRef.current = true;
    }
    
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('doc:sync');
      socket.off('doc:update');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('cursor:updated');
      socket.off('selection:updated');
      socket.off('error');
    };
  }, [documentId, userId, userType, userName, enabled]);
  
  // Fetch collaborators and settings
  const refreshCollaborators = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const headers: Record<string, string> = {};
      if (userType === 'guest') {
        headers['x-guest-id'] = userId;
        headers['x-guest-name'] = userName;
      }

      const response = await fetch(`/api/write/collaboration/${documentId}`, {
        credentials: 'include',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
        setSettings(data.settings);
        setMyRole(data.myRole);
        setIsOwner(data.isOwner);
      }
    } catch (error) {
      console.error('[Collaboration] Error fetching collaborators:', error);
    }
  }, [documentId, enabled]);
  
  useEffect(() => {
    refreshCollaborators();
  }, [refreshCollaborators]);
  
  const connect = useCallback(() => {
    if (!isJoinedRef.current && socketRef.current) {
      joinDocument(documentId, userId, userType, userName);
      isJoinedRef.current = true;
    }
  }, [documentId, userId, userType, userName]);
  
  const disconnect = useCallback(() => {
    if (isJoinedRef.current) {
      leaveDocument(documentId);
      isJoinedRef.current = false;
    }
  }, [documentId]);
  
  const inviteUser = useCallback(async (email: string, role: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userType === 'guest') {
        headers['x-guest-id'] = userId;
        headers['x-guest-name'] = userName;
      }

      const response = await fetch(`/api/write/collaboration/${documentId}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email, role }),
      });
      
      if (response.ok) {
        await refreshCollaborators();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Collaboration] Error inviting user:', error);
      return false;
    }
  }, [documentId, refreshCollaborators]);
  
  const removeCollaborator = useCallback(async (collaboratorId: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {};
      if (userType === 'guest') {
        headers['x-guest-id'] = userId;
        headers['x-guest-name'] = userName;
      }

      const response = await fetch(
        `/api/write/collaboration/${documentId}/invite?collaboratorId=${collaboratorId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers
        }
      );
      
      if (response.ok) {
        await refreshCollaborators();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Collaboration] Error removing collaborator:', error);
      return false;
    }
  }, [documentId, refreshCollaborators]);
  
  const updateCollaboratorRole = useCallback(async (collaboratorId: string, role: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userType === 'guest') {
        headers['x-guest-id'] = userId;
        headers['x-guest-name'] = userName;
      }

      const response = await fetch(`/api/write/collaboration/${documentId}/invite`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ collaboratorId, role }),
      });
      
      if (response.ok) {
        await refreshCollaborators();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Collaboration] Error updating collaborator role:', error);
      return false;
    }
  }, [documentId, refreshCollaborators, userId, userType, userName]);

  const updateSettings = useCallback(async (newSettings: Partial<CollaborationSettings>): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userType === 'guest') {
        headers['x-guest-id'] = userId;
        headers['x-guest-name'] = userName;
      }

      const response = await fetch(`/api/write/collaboration/${documentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ settings: newSettings }),
      });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
          return true;
        }
        return false;
      } catch (error) {
        console.error('[Collaboration] Error updating settings:', error);
        return false;
      }
    },
    [documentId]
  );
  
  return {
    isConnected,
    collaborators,
    activeUsers,
    settings,
    myRole,
    isOwner,
    yDoc: yDocRef.current,
    connect,
    disconnect,
    inviteUser,
    removeCollaborator,
    updateCollaboratorRole,
    updateSettings,
    refreshCollaborators,
  };
}
