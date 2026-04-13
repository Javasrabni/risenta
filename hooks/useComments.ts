'use client';

import { useState, useEffect, useCallback } from 'react';
import { Comment } from '@/types/collaboration';

interface UseCommentsProps {
  documentId: string;
  enabled: boolean;
}

interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  addComment: (content: string, selectionRange: any, type?: string) => Promise<boolean>;
  addReply: (parentId: string, content: string) => Promise<boolean>;
  resolveComment: (commentId: string) => Promise<boolean>;
  refreshComments: () => Promise<void>;
}

export function useComments({ documentId, enabled }: UseCommentsProps): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchComments = useCallback(async () => {
    if (!enabled || !documentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/write/comments/${documentId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch comments');
      }
    } catch (err) {
      setError('Network error');
      console.error('[useComments] Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, enabled]);
  
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  
  const addComment = useCallback(
    async (content: string, selectionRange: any, type: string = 'comment'): Promise<boolean> => {
      try {
        const response = await fetch(`/api/write/comments/${documentId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, selectionRange, type }),
        });
        
        if (response.ok) {
          await fetchComments();
          return true;
        }
        
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add comment');
        return false;
      } catch (err) {
        setError('Network error');
        console.error('[useComments] Error adding comment:', err);
        return false;
      }
    },
    [documentId, fetchComments]
  );
  
  const addReply = useCallback(
    async (parentId: string, content: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/write/comments/${documentId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, parentId, selectionRange: {} }),
        });
        
        if (response.ok) {
          await fetchComments();
          return true;
        }
        
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add reply');
        return false;
      } catch (err) {
        setError('Network error');
        console.error('[useComments] Error adding reply:', err);
        return false;
      }
    },
    [documentId, fetchComments]
  );
  
  const resolveComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/write/comments/${documentId}/${commentId}/resolve`, {
          method: 'PATCH',
          credentials: 'include',
        });
        
        if (response.ok) {
          await fetchComments();
          return true;
        }
        
        return false;
      } catch (err) {
        console.error('[useComments] Error resolving comment:', err);
        return false;
      }
    },
    [documentId, fetchComments]
  );
  
  return {
    comments,
    isLoading,
    error,
    addComment,
    addReply,
    resolveComment,
    refreshComments: fetchComments,
  };
}
