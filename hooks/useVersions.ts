'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocumentVersion } from '@/types/collaboration';

interface UseVersionsProps {
  documentId: string;
  enabled: boolean;
}

interface UseVersionsReturn {
  versions: DocumentVersion[];
  isLoading: boolean;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  createVersion: (manual?: boolean) => Promise<boolean>;
  getVersion: (versionId: string) => Promise<DocumentVersion | null>;
  restoreVersion: (versionId: string) => Promise<boolean>;
  refreshVersions: () => Promise<void>;
}

export function useVersions({ documentId, enabled }: UseVersionsProps): UseVersionsReturn {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  
  const LIMIT = 20;
  
  const fetchVersions = useCallback(
    async (reset: boolean = false) => {
      if (!enabled || !documentId) return;
      
      const currentOffset = reset ? 0 : offset;
      
      setIsLoading(true);
      
      try {
        const response = await fetch(
          `/api/write/versions/${documentId}?limit=${LIMIT}&offset=${currentOffset}`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (reset) {
            setVersions(data.versions || []);
            setOffset(LIMIT);
          } else {
            setVersions((prev) => [...prev, ...(data.versions || [])]);
            setOffset((prev) => prev + LIMIT);
          }
          
          setHasMore(data.hasMore || false);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error('[useVersions] Error fetching versions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [documentId, enabled, offset]
  );
  
  useEffect(() => {
    fetchVersions(true);
  }, [documentId, enabled]);
  
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await fetchVersions(false);
  }, [fetchVersions, hasMore, isLoading]);
  
  const createVersion = useCallback(
    async (manual: boolean = true): Promise<boolean> => {
      try {
        const response = await fetch(`/api/write/versions/${documentId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual }),
        });
        
        if (response.ok) {
          await fetchVersions(true);
          return true;
        }
        
        return false;
      } catch (err) {
        console.error('[useVersions] Error creating version:', err);
        return false;
      }
    },
    [documentId, fetchVersions]
  );
  
  const getVersion = useCallback(
    async (versionId: string): Promise<DocumentVersion | null> => {
      try {
        const response = await fetch(
          `/api/write/versions/${documentId}/${versionId}`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          return data.version || null;
        }
        
        return null;
      } catch (err) {
        console.error('[useVersions] Error fetching version:', err);
        return null;
      }
    },
    [documentId]
  );
  
  const restoreVersion = useCallback(
    async (versionId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/write/versions/${documentId}/${versionId}/restore`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );
        
        if (response.ok) {
          await fetchVersions(true);
          return true;
        }
        
        return false;
      } catch (err) {
        console.error('[useVersions] Error restoring version:', err);
        return false;
      }
    },
    [documentId, fetchVersions]
  );
  
  return {
    versions,
    isLoading,
    hasMore,
    total,
    loadMore,
    createVersion,
    getVersion,
    restoreVersion,
    refreshVersions: () => fetchVersions(true),
  };
}
