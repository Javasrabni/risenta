'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Document } from '@/types/write';
import { saveDraft, getDraft, clearDraft, DraftData } from '@/lib/documentCache';

interface UseAutoSaveOptions {
  documentId: string;
  content: string;
  title: string;
  type: Document['type'];
  template?: Document['template'];
  wordCount: number;
  charCount: number;
  pageSettings: Document['pageSettings'];
  enabled?: boolean;
  interval?: number; // milliseconds
  onSave?: () => void;
}

interface UseAutoSaveReturn {
  lastSaved: Date | null;
  isSaving: boolean;
  saveNow: () => void;
  hasDraft: boolean;
  draftData: DraftData | null;
}

export function useAutoSave({
  documentId,
  content,
  title,
  type,
  template,
  wordCount,
  charCount,
  pageSettings,
  enabled = true,
  interval = 3000, // Auto-save every 3 seconds
  onSave,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const statsRef = useRef({ wordCount, charCount });

  // Update refs when values change
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    statsRef.current = { wordCount, charCount };
  }, [wordCount, charCount]);

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const draft = getDraft(documentId);
    if (draft) {
      setHasDraft(true);
      setDraftData(draft);
      setLastSaved(new Date(draft.updatedAt));
    }
  }, [documentId]);

  // Perform auto-save
  const performSave = useCallback(() => {
    if (!enabled || !documentId) return;

    setIsSaving(true);
    
    try {
      saveDraft(documentId, {
        title: titleRef.current,
        content: contentRef.current,
        type,
        template,
        wordCount: statsRef.current.wordCount,
        charCount: statsRef.current.charCount,
        pageSettings,
        updatedAt: new Date().toISOString(),
      });
      
      const now = new Date();
      setLastSaved(now);
      setHasDraft(true);
      onSave?.();
    } catch (error) {
      console.error('[AutoSave] Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, type, template, pageSettings, enabled, onSave]);

  // Save immediately (for manual save trigger)
  const saveNow = useCallback(() => {
    performSave();
  }, [performSave]);

  // Schedule auto-save when content changes
  useEffect(() => {
    if (!enabled || !documentId) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new auto-save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, title, documentId, interval, enabled, performSave]);

  // Save on window beforeunload (when user closes tab/refreshes)
  useEffect(() => {
    if (!enabled || !documentId) return;

    const handleBeforeUnload = () => {
      // Synchronous save for beforeunload
      try {
        saveDraft(documentId, {
          title: titleRef.current,
          content: contentRef.current,
          type,
          wordCount: statsRef.current.wordCount,
          charCount: statsRef.current.charCount,
          pageSettings,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[AutoSave] Failed to save on beforeunload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [documentId, type, pageSettings, enabled]);

  // Clear draft when document is manually saved to DB
  const clearDraftCallback = useCallback(() => {
    clearDraft(documentId);
    setHasDraft(false);
    setDraftData(null);
  }, [documentId]);

  return {
    lastSaved,
    isSaving,
    saveNow,
    hasDraft,
    draftData,
  };
}

// Hook to restore draft on initial load
export function useRestoreDraft(documentId: string): DraftData | null {
  const [draft, setDraft] = useState<DraftData | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedDraft = getDraft(documentId);
    if (savedDraft) {
      setDraft(savedDraft);
    }
  }, [documentId]);

  return draft;
}
