// Document Cache Utility - localStorage based caching for instant document loading
const CACHE_KEY = 'risenta_docs_cache';
const CACHE_VERSION = 'v1';

export interface CachedDocument {
  id: string;
  title: string;
  content: string;
  type: 'essay' | 'article' | 'journal' | 'thesis' | 'blank';
  template?: 'blank' | 'essay' | 'thesis' | 'article' | 'journal' | 'research' | 'report';
  wordCount: number;
  charCount: number;
  pageSettings: {
    size: 'a4' | 'a5' | 'letter' | 'legal' | 'custom';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    customWidth?: number;
    customHeight?: number;
  };
  updatedAt: string;
  version: string;
}

interface CacheData {
  documents: Record<string, CachedDocument>;
  lastUpdated: string;
  version: string;
}

// Get cache from localStorage
export const getCache = (): CacheData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CacheData;
    
    // Validate version
    if (data.version !== CACHE_VERSION) {
      clearCache();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

// Save document to cache
export const cacheDocument = (doc: CachedDocument): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getCache() || {
      documents: {},
      lastUpdated: new Date().toISOString(),
      version: CACHE_VERSION,
    };
    
    cache.documents[doc.id] = {
      ...doc,
      version: CACHE_VERSION,
    };
    cache.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching document:', error);
    // If quota exceeded, clear old cache and try again
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearCache();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          documents: { [doc.id]: doc },
          lastUpdated: new Date().toISOString(),
          version: CACHE_VERSION,
        }));
      } catch (e) {
        console.error('Failed to cache after clearing:', e);
      }
    }
  }
};

// Get single document from cache
export const getCachedDocument = (id: string): CachedDocument | null => {
  const cache = getCache();
  if (!cache) return null;
  
  return cache.documents[id] || null;
};

// Get all cached documents
export const getAllCachedDocuments = (): CachedDocument[] => {
  const cache = getCache();
  if (!cache) return [];
  
  return Object.values(cache.documents).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
};

// Remove document from cache
export const removeCachedDocument = (id: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getCache();
    if (!cache) return;
    
    delete cache.documents[id];
    cache.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error removing cached document:', error);
  }
};

// Clear entire cache
export const clearCache = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Sync server documents with cache (server data takes precedence)
export const syncWithServer = (serverDocs: CachedDocument[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getCache();
    const mergedDocs: Record<string, CachedDocument> = {};
    
    // Add all server documents
    serverDocs.forEach((doc) => {
      mergedDocs[doc.id] = {
        ...doc,
        version: CACHE_VERSION,
      };
    });
    
    // For any docs in cache but not in server, check if they're newer
    if (cache) {
      Object.values(cache.documents).forEach((cachedDoc) => {
        if (!mergedDocs[cachedDoc.id]) {
          // Doc exists in cache but not server - keep it (might be offline creation)
          mergedDocs[cachedDoc.id] = cachedDoc;
        }
      });
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      documents: mergedDocs,
      lastUpdated: new Date().toISOString(),
      version: CACHE_VERSION,
    }));
  } catch (error) {
    console.error('Error syncing cache:', error);
  }
};

// Check if cache is stale (older than X hours)
export const isCacheStale = (hours: number = 24): boolean => {
  const cache = getCache();
  if (!cache) return true;
  
  const lastUpdated = new Date(cache.lastUpdated).getTime();
  const now = Date.now();
  const hoursInMs = hours * 60 * 60 * 1000;
  
  return now - lastUpdated > hoursInMs;
};

// DRAFT AUTO-SAVE FUNCTIONS
// Separate from document cache for draft persistence

const DRAFT_KEY_PREFIX = 'risenta_draft_';

export interface DraftData {
  id: string;
  title: string;
  content: string;
  type: 'essay' | 'article' | 'journal' | 'thesis' | 'blank';
  template?: 'blank' | 'essay' | 'thesis' | 'article' | 'journal' | 'research' | 'report';
  wordCount: number;
  charCount: number;
  pageSettings: {
    size: 'a4' | 'a5' | 'letter' | 'legal' | 'custom';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    customWidth?: number;
    customHeight?: number;
  };
  updatedAt: string;
  isAutoSave: boolean;
}

// Save draft to localStorage (auto-save)
export const saveDraft = (docId: string, draft: Omit<DraftData, 'id' | 'isAutoSave'>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const draftData: DraftData = {
      ...draft,
      id: docId,
      isAutoSave: true,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${docId}`, JSON.stringify(draftData));
    console.log('[AutoSave] Draft saved for doc:', docId);
  } catch (error) {
    console.error('[AutoSave] Error saving draft:', error);
  }
};

// Get draft from localStorage
export const getDraft = (docId: string): DraftData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const draftJson = localStorage.getItem(`${DRAFT_KEY_PREFIX}${docId}`);
    if (!draftJson) return null;
    
    const draft = JSON.parse(draftJson) as DraftData;
    console.log('[AutoSave] Draft retrieved for doc:', docId);
    return draft;
  } catch (error) {
    console.error('[AutoSave] Error retrieving draft:', error);
    return null;
  }
};

// Clear draft after successful save to DB
export const clearDraft = (docId: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${docId}`);
    console.log('[AutoSave] Draft cleared for doc:', docId);
  } catch (error) {
    console.error('[AutoSave] Error clearing draft:', error);
  }
};

// Get all drafts from localStorage
export const getAllDrafts = (): DraftData[] => {
  if (typeof window === 'undefined') return [];
  
  const drafts: DraftData[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        const draftJson = localStorage.getItem(key);
        if (draftJson) {
          drafts.push(JSON.parse(draftJson) as DraftData);
        }
      }
    }
  } catch (error) {
    console.error('[AutoSave] Error getting all drafts:', error);
  }
  
  return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

// Check if draft exists and is newer than server version
export const hasNewerDraft = (docId: string, serverUpdatedAt: string): boolean => {
  const draft = getDraft(docId);
  if (!draft) return false;
  
  const draftTime = new Date(draft.updatedAt).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();
  
  return draftTime > serverTime;
};
