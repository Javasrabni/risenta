'use client';

import { useState, useEffect, useCallback } from 'react';
import { Collaborator, CollaborationSettings } from '@/types/collaboration';

interface UseCollaborationProps {
  documentId: string;
  userId: string;
  userType: string;
  userName: string;
  enabled: boolean;
}

interface UseCollaborationReturn {
  collaborators: Collaborator[];
  settings: CollaborationSettings | null;
  myRole: string;
  isOwner: boolean;
  inviteUser: (email: string, role: string) => Promise<boolean>;
  removeCollaborator: (collaboratorId: string) => Promise<boolean>;
  updateCollaboratorRole: (collaboratorId: string, role: string) => Promise<boolean>;
  updateSettings: (settings: Partial<CollaborationSettings>) => Promise<boolean>;
  refreshCollaborators: () => Promise<void>;
}

/**
 * useCollaboration — REST-only collaboration management hook.
 *
 * This hook manages collaborators list, settings, and permissions via REST API.
 * Real-time document synchronization is handled entirely by Tiptap's
 * Collaboration extension + y-websocket (inside TiptapWriteEditor).
 *
 * This separation prevents dual Yjs doc conflicts that previously caused
 * cursor jumping and sync instability.
 */
export function useCollaboration({
  documentId,
  userId,
  userType,
  userName,
  enabled,
}: UseCollaborationProps): UseCollaborationReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [settings, setSettings] = useState<CollaborationSettings | null>(null);
  const [myRole, setMyRole] = useState<string>('viewer');
  const [isOwner, setIsOwner] = useState(false);

  // Build headers for guest users
  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (userType === 'guest') {
      headers['x-guest-id'] = userId;
      headers['x-guest-name'] = userName;
    }
    return headers;
  }, [userId, userType, userName]);

  // Fetch collaborators and settings from REST API
  const refreshCollaborators = useCallback(async () => {
    if (!enabled || !documentId) return;

    try {
      const response = await fetch(`/api/write/collaboration/${documentId}`, {
        credentials: 'include',
        headers: getHeaders(),
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
  }, [documentId, enabled, getHeaders]);

  // Refresh on mount and when documentId changes
  useEffect(() => {
    refreshCollaborators();
  }, [refreshCollaborators]);

  const inviteUser = useCallback(async (email: string, role: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/write/collaboration/${documentId}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
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
  }, [documentId, refreshCollaborators, getHeaders]);

  const removeCollaborator = useCallback(async (collaboratorId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/write/collaboration/${documentId}/invite?collaboratorId=${collaboratorId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: getHeaders(),
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
  }, [documentId, refreshCollaborators, getHeaders]);

  const updateCollaboratorRole = useCallback(async (collaboratorId: string, role: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/write/collaboration/${documentId}/invite`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
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
  }, [documentId, refreshCollaborators, getHeaders]);

  const updateSettings = useCallback(async (newSettings: Partial<CollaborationSettings>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/write/collaboration/${documentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
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
  }, [documentId, getHeaders]);

  return {
    collaborators,
    settings,
    myRole,
    isOwner,
    inviteUser,
    removeCollaborator,
    updateCollaboratorRole,
    updateSettings,
    refreshCollaborators,
  };
}
