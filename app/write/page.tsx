'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import WriteTopBar from '@/components/write/WriteTopBar';
import WriteSidebar from '@/components/write/WriteSidebar';
import WriteEditor from '@/components/write/WriteEditor';
import WriteRightPanel from '@/components/write/WriteRightPanel';
import WriteModals from '@/components/write/WriteModals';
import TemplateSelector from '@/components/write/TemplateSelector';
import ToastContainer from '@/components/write/ToastContainer';
import ShareModal from '@/components/write/ShareModal';
import { Document, TokenUsage, DailyTarget, ChiMood, DEFAULT_PAGE_SETTINGS, DocumentTemplate, DOCUMENT_TEMPLATES } from '@/types/write';
import { generateId } from '@/lib/writeUtils';
import { clearDraft, getDraft } from '@/lib/documentCache';
import { useCollaboration } from '@/hooks/useCollaboration';
import '@/styles/write.css';

export default function WritePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    planId: 'free',
    planName: 'Free',
    autoGenerateRemaining: 1,
    autoGenerateTotal: 1,
    promptRemaining: 4,
    promptTotal: 4,
    planExpiresAt: null,
    isExpired: false,
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>({
    words: 500,
    current: 0,
  });
  const [chiMood, setChiMood] = useState<ChiMood>({
    type: 'idle',
    comment: 'Siap membantu Anda menulis hari ini!',
  });
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [ghostEnabled, setGhostEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const autoGenerateCallbackRef = useRef<((content: string, topic: string) => void) | null>(null);
  const aiGeneratingCallbackRef = useRef<((isGenerating: boolean) => void) | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<{ name: string; role: string; isInternalAdmin?: boolean; id?: string } | null>(null);
  const [guestData, setGuestData] = useState<{ id: string; name: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [autoSaveStatus, setAutoSaveStatus] = useState<{ isAutoSaving: boolean; lastSaved: Date | null }>({
    isAutoSaving: false,
    lastSaved: null,
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<Partial<Document> | null>(null);

  // Check auth status on mount and load appropriate documents
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        
        // Try customer auth first
        const customerRes = await fetch("/api/customer/auth/me", {
          credentials: 'include'
        });
        const customerData = await customerRes.json();
        
        if (customerData.loggedIn) {
          setIsAuthenticated(true);
          setUserData({
            name: customerData.customer?.name || 'Customer',
            role: 'customer',
            id: customerData.customer?._id || customerData.customer?.customerID
          });
          // Load customer's plan data
          await fetchCustomerPlan();
          // Load from database for authenticated users (with migration)
          await loadDocumentsFromDB(true);
          return;
        }
        
        // If customer auth fails, try admin auth
        const adminRes = await fetch("/api/auth/me", {
          credentials: 'include'
        });
        const adminData = await adminRes.json();
        
        if (adminData.loggedIn) {
          setIsAuthenticated(true);
          setIsAdmin(true);
          setUserData({
            name: adminData.admin?.adm_usn || 'Admin',
            role: 'admin',
            isInternalAdmin: adminData.isInternalAdmin,
            id: adminData.admin?._id || adminData.admin?.adm_id
          });
          // Load from database for authenticated users (with migration)
          await loadDocumentsFromDB(true);
        } else {
          // Guest user - load from localStorage
          setIsAuthenticated(false);
          let guestId = localStorage.getItem('guest_id');
          let guestName = localStorage.getItem('guest_name');
          if (!guestId) {
            guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
            guestName = 'Tamu ' + Math.floor(Math.random() * 1000);
            localStorage.setItem('guest_id', guestId);
            localStorage.setItem('guest_name', guestName);
          }
          setUserData(null);
          setGuestData({ id: guestId, name: guestName || 'Tamu' });
          loadDocumentsFromLocalStorage();
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setIsAuthenticated(false);
        loadDocumentsFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  // Handle shared document link (?shared=docId)
  useEffect(() => {
    const handleSharedLink = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedDocId = urlParams.get('shared');
      
      const activeId = userData?.id || guestData?.id;
      const activeName = userData?.name || guestData?.name;
      if (!sharedDocId || !activeId) return;
      
      try {
        const headers: Record<string, string> = {};
        if (!isAuthenticated && guestData) {
          headers['x-guest-id'] = guestData.id;
          headers['x-guest-name'] = guestData.name;
        }

        // First, check collaboration settings (public info for shared docs)
        const collabRes = await fetch(`/api/write/collaboration/${sharedDocId}`, {
          credentials: 'include',
          headers
        });
        
        if (!collabRes.ok) {
          console.error('Shared document not found or not accessible');
          setChiMood({
            type: 'concerned',
            comment: 'Dokumen tidak ditemukan atau Anda tidak memiliki akses.'
          });
          return;
        }
        
        const collabData = await collabRes.json();
        
        // Check if user is already a collaborator or owner
        const isAlreadyCollaborator = collabData.collaborators?.some(
          (c: any) => c.userId === activeId
        );
        const isOwner = collabData.isOwner;
        
        // If not already a collaborator and not owner, auto-join (or request join)
        if (!isAlreadyCollaborator && !isOwner) {
          // Add self as collaborator with default role
          const joinRes = await fetch(`/api/write/collaboration/${sharedDocId}/invite`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({
              selfJoin: true,     // Explicitly trigger self-join
              role: collabData.settings?.defaultRole || 'viewer'
            })
          });
          
          if (!joinRes.ok) {
            console.error('Failed to join as collaborator');
            setChiMood({
              type: 'concerned',
              comment: 'Gagal bergabung ke dokumen. Mungkin memerlukan undangan.'
            });
            return;
          }
        }
        
        // Now fetch the document
        const docRes = await fetch(`/api/write/documents/${sharedDocId}`, {
          credentials: 'include',
          headers
        });
        
        if (!docRes.ok) {
          console.error('Failed to fetch shared document');
          return;
        }
        
        const docData = await docRes.json();
        
        if (docData.document) {
          // Add to documents list if not already present
          setDocuments(prev => {
            const exists = prev.find(d => d.id === sharedDocId);
            if (exists) return prev;
            return [...prev, docData.document];
          });
          
          // Set as active document
          setActiveDocId(sharedDocId);
          
          // Show success message
          setChiMood({
            type: 'happy',
            comment: `Dokumen berhasil dibuka! Anda sekarang berkolaborasi pada "${docData.document.title}".`
          });
          
          // Refresh collaboration data
          collaboration.refreshCollaborators();
          
          // We keep the query parameter so that on reload the user stays on the shared doc.
        }
      } catch (err) {
        console.error('Error handling shared link:', err);
        setChiMood({
          type: 'concerned',
          comment: 'Terjadi kesalahan saat membuka dokumen bersama.'
        });
      }
    };
    
    const activeId = userData?.id || guestData?.id;
    if (activeId) {
      handleSharedLink();
    }
  }, [isAuthenticated, userData?.id, guestData?.id]);

  // Migrate guest documents to database when user is newly registered after being a guest
  const migrateGuestDocuments = async () => {
    // Only migrate if user just registered (was guest with documents, then registered)
    const justRegistered = localStorage.getItem('justRegistered');
    const hasGuestDocuments = localStorage.getItem('hasGuestDocuments');

    // Migration only works if:
    // 1. User just registered (justRegistered flag exists)
    // 2. User had guest documents (hasGuestDocuments flag exists)
    if (!justRegistered || !hasGuestDocuments) {
      return;
    }

    const saved = localStorage.getItem('write-documents');
    if (!saved) {
      // Clear flags even if no documents to migrate
      localStorage.removeItem('justRegistered');
      localStorage.removeItem('hasGuestDocuments');
      return;
    }

    try {
      const guestDocs = JSON.parse(saved);
      if (!guestDocs || guestDocs.length === 0) {
        localStorage.removeItem('justRegistered');
        localStorage.removeItem('hasGuestDocuments');
        return;
      }

      // Call migration API
      const response = await fetch('/api/write/documents/migrate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: guestDocs })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.migrated > 0) {
          console.log(`Migrated ${data.migrated} documents to your account`);
        }
      }
    } catch (error) {
      console.error('Error migrating documents:', error);
    } finally {
      // Clear migration flags and guest documents after migration attempt
      localStorage.removeItem('justRegistered');
      localStorage.removeItem('hasGuestDocuments');
      localStorage.removeItem('write-documents');
      localStorage.removeItem('write-active-doc-id');
    }
  };

  // Fetch customer's plan and usage data
  const fetchCustomerPlan = async () => {
    try {
      const response = await fetch('/api/customer/plan', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.loggedIn && data.plan && data.usage) {
          setTokenUsage({
            planId: data.plan.planId,
            planName: data.plan.planName,
            autoGenerateRemaining: data.usage.autoGenerateTotal,
            autoGenerateTotal: data.plan.limits.autoGenerate === -1 ? -1 : data.usage.autoGenerateTotal,
            promptRemaining: data.usage.promptTotal,
            promptTotal: data.plan.limits.prompt === -1 ? -1 : data.usage.promptTotal,
            planExpiresAt: data.plan.expiresAt,
            isExpired: data.plan.isExpired,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching customer plan:', error);
    }
  };

  // Load documents from database (for authenticated users)
  const loadDocumentsFromDB = async (shouldMigrate = false) => {
    // If migration requested, try to migrate guest documents first
    if (shouldMigrate) {
      await migrateGuestDocuments();
    }
    try {
      const response = await fetch('/api/write/documents', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
          // Convert date strings to Date objects
          const docs = data.documents.map((doc: Document) => ({
            ...doc,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt)
          }));
          setDocuments(docs);
          // Try to restore last active document from localStorage
          const savedActiveDocId = localStorage.getItem('write-active-doc-id');
          const lastActiveDoc = savedActiveDocId && docs.find((d: Document) => d.id === savedActiveDocId);
          if (lastActiveDoc) {
            setActiveDocId(lastActiveDoc.id);
          } else {
            setActiveDocId(docs[0].id);
          }
        } else {
          // No documents in DB, create default
          await createDefaultDocumentDB();
        }
      } else {
        console.error('Failed to load documents from DB');
        // Fall back to localStorage even for auth users
        loadDocumentsFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading documents from DB:', error);
      loadDocumentsFromLocalStorage();
    }
  };

  // Load documents from localStorage (for guest users)
  const loadDocumentsFromLocalStorage = () => {
    const saved = localStorage.getItem('write-documents');
    const savedActiveDocId = localStorage.getItem('write-active-doc-id');
    
    if (saved) {
      try {
        const docs = JSON.parse(saved);
        // Ensure dates are properly converted
        const parsedDocs = docs.map((doc: Document) => ({
          ...doc,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt)
        }));
        setDocuments(parsedDocs);
        
        if (savedActiveDocId && parsedDocs.find((d: Document) => d.id === savedActiveDocId)) {
          setActiveDocId(savedActiveDocId);
        } else if (parsedDocs.length > 0) {
          setActiveDocId(parsedDocs[0].id);
        }
      } catch (e) {
        console.error('Error parsing localStorage documents:', e);
        createDefaultDocumentLocal();
      }
    } else {
      createDefaultDocumentLocal();
    }
  };

  const createDefaultDocumentLocal = () => {
    const defaultDoc: Document = {
      id: generateId(),
      title: 'Dokumen Tanpa Judul',
      content: '',
      type: 'essay',
      wordCount: 0,
      charCount: 0,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'guest',
    };
    setDocuments([defaultDoc]);
    setActiveDocId(defaultDoc.id);
  };

  const createDefaultDocumentDB = async () => {
    try {
      const response = await fetch('/api/write/documents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Dokumen Tanpa Judul',
          content: '',
          type: 'essay',
          wordCount: 0,
          charCount: 0,
          pageSettings: DEFAULT_PAGE_SETTINGS
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newDoc = {
          ...data.document,
          createdAt: new Date(data.document.createdAt),
          updatedAt: new Date(data.document.updatedAt)
        };
        setDocuments([newDoc]);
        setActiveDocId(newDoc.id);
      } else {
        createDefaultDocumentLocal();
      }
    } catch (error) {
      console.error('Error creating default document in DB:', error);
      createDefaultDocumentLocal();
    }
  };

  // Load preferences from localStorage (for all users)
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('write-dark-mode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark-theme');
    }

    const savedTarget = localStorage.getItem('write-daily-target');
    if (savedTarget) {
      setDailyTarget(JSON.parse(savedTarget));
    }

    const savedTokens = localStorage.getItem('write-token-usage');
    if (savedTokens) {
      setTokenUsage(JSON.parse(savedTokens));
    }
  }, []);

  // Save documents to localStorage whenever they change (anticipation/backup only)
  useEffect(() => {
    if (documents.length > 0) {
      localStorage.setItem('write-documents', JSON.stringify(documents));
      // Mark that guest has documents (for migration eligibility)
      if (!isAuthenticated) {
        localStorage.setItem('hasGuestDocuments', 'true');
      }
    }
  }, [documents, isAuthenticated]);

  // Auto-save to database (only for authenticated users)
  const saveToDatabase = useCallback(async (doc: Partial<Document> & { id: string }) => {
    // Only save to DB if authenticated
    if (!isAuthenticated) {
      setSaveStatus('saved'); // Guest users show as saved (to localStorage)
      return null;
    }
    
    try {
      setSaveStatus('saving');
      const response = await fetch('/api/write/documents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        const data = await response.json();
        return data.document;
      } else {
        setSaveStatus('unsaved');
        console.error('Failed to save document to DB');
        return null;
      }
    } catch (error) {
      setSaveStatus('unsaved');
      console.error('Error saving document:', error);
      return null;
    }
  }, [isAuthenticated]);

  // Save active document ID to localStorage whenever it changes
  useEffect(() => {
    if (activeDocId) {
      localStorage.setItem('write-active-doc-id', activeDocId);
    }
  }, [activeDocId]);

  const activeDoc = documents.find(d => d.id === activeDocId);

  // Initialize collaboration when we have an active document and user
  const collaboration = useCollaboration({
    documentId: activeDoc?.id || '',
    userId: userData?.id || guestData?.id || '',
    userType: userData ? (userData.role === 'admin' ? 'admin' : 'customer') : 'guest',
    userName: userData?.name || guestData?.name || 'Anonymous',
    enabled: !!(activeDoc?.id && (userData?.id || guestData?.id)),
  });

  // Manual save to database - only called on Ctrl+S or save button click
  const saveToDatabaseManual = useCallback(async (doc?: Document) => {
    const activeId = userData?.id || guestData?.id;
    if (!activeId) {
      console.log('[WritePage] No user or guest identity, skipping database save');
      return;
    }
    
    const docToSave = doc || activeDoc;
    if (!docToSave) {
      console.warn('[WritePage] No active document to save');
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!isAuthenticated && guestData) {
        headers['x-guest-id'] = guestData.id;
        headers['x-guest-name'] = guestData.name;
      }

      const response = await fetch('/api/write/documents', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          id: docToSave.id,
          title: docToSave.title,
          content: docToSave.content,
          type: docToSave.type,
          wordCount: docToSave.wordCount,
          charCount: docToSave.charCount,
          pageSettings: docToSave.pageSettings,
          updatedAt: docToSave.updatedAt,
        }),
      });
      
      const data = await response.json();
      const savedDoc = data.document;
      
      if (savedDoc) {
        // If ID changed (e.g. from local guest ID to DB ID)
        if (docToSave.id !== savedDoc.id) {
          setDocuments(prev => {
            const filtered = prev.filter(d => d.id !== docToSave.id);
            // Check if already exists by new ID
            if (filtered.find(d => d.id === savedDoc.id)) return filtered;
            return [...filtered, savedDoc];
          });
          setActiveDocId(savedDoc.id);
        } else {
          // Just update the document in list
          setDocuments(prev => prev.map(d => d.id === savedDoc.id ? savedDoc : d));
        }
      }

      // Clear the autosave draft since we've saved to DB
      clearDraft(docToSave.id);
      
      setSaveStatus('saved');
      console.log('[WritePage] Document saved to database:', savedDoc?.id || docToSave.id);
    } catch (error) {
      console.error('[WritePage] Error saving document:', error);
      setSaveStatus('unsaved');
    }
  }, [isAuthenticated, activeDoc]);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id
          ? { ...doc, ...updates, updatedAt: new Date() }
          : doc
      )
    );
    
    // Only save to localStorage automatically (anticipation/backup)
    // Database save only happens on manual Ctrl+S or save button
    setSaveStatus('unsaved');
  }, []);

  // Ctrl+S keyboard shortcut for manual save to database
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isAuthenticated && activeDoc) {
          saveToDatabaseManual(activeDoc);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, activeDoc, saveToDatabaseManual]);

  const createNewDocument = async (template: DocumentTemplate = 'blank') => {
    setSaveStatus('saving');
    
    const templateDef = DOCUMENT_TEMPLATES[template];
    const templateContent = generateTemplateContent(template);
    
    // For authenticated users, create in DB
    if (isAuthenticated) {
      try {
        const response = await fetch('/api/write/documents', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: templateDef.name,
            content: templateContent,
            type: templateDef.type,
            template: template,
            wordCount: 0,
            charCount: 0,
            pageSettings: DEFAULT_PAGE_SETTINGS
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const newDoc: Document = {
            ...data.document,
            template: template,
            createdAt: new Date(data.document.createdAt),
            updatedAt: new Date(data.document.updatedAt)
          };
          setDocuments(prev => [...prev, newDoc]);
          setActiveDocId(newDoc.id);
          setSaveStatus('saved');
          return;
        }
      } catch (error) {
        console.error('Error creating document in DB:', error);
      }
    }
    
    // Fallback to local (for guests or DB error)
    createNewDocumentLocal(template);
  };

  const createNewDocumentLocal = (template: DocumentTemplate = 'blank') => {
    const templateDef = DOCUMENT_TEMPLATES[template];
    const templateContent = generateTemplateContent(template);
    
    const newDoc: Document = {
      id: generateId(),
      title: templateDef.name,
      content: templateContent,
      type: templateDef.type,
      template: template,
      wordCount: 0,
      charCount: 0,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: userData?.id || 'user-1',
    };
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    setSaveStatus('saved');
  };

  // Generate initial content based on template
  const generateTemplateContent = (template: DocumentTemplate): string => {
    const templateDef = DOCUMENT_TEMPLATES[template];
    if (!templateDef.sections || templateDef.sections.length === 0) {
      return '<p><br></p>';
    }
    
    return templateDef.sections.map(section => {
      // Convert multi-line placeholder to paragraphs
      const placeholderLines = section.placeholder.split('\n\n');
      const placeholderHTML = placeholderLines
        .filter(line => line.trim())
        .map(line => `<p data-template-placeholder="${section.id}" style="margin-bottom: 8px; opacity: 0.4; font-style: italic; color: var(--text3);">${line.replace(/\n/g, '<br>')}</p>`)
        .join('');
      
      return `<h3 data-template-section="${section.id}">${section.title}</h3>${placeholderHTML}<p><br></p>`;
    }).join('');
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setShowTemplateModal(false);
    createNewDocument(template);
  };

  const deleteDocument = async (id: string) => {
    // Delete from database (only for authenticated users)
    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/write/documents/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok && response.status !== 404) {
          console.error('Failed to delete document from DB');
        }
      } catch (error) {
        console.error('Error deleting document from DB:', error);
      }
    }
    
    // Update local state
    const filtered = documents.filter(d => d.id !== id);
    setDocuments(filtered);
    if (activeDocId === id && filtered.length > 0) {
      setActiveDocId(filtered[0].id);
    } else if (filtered.length === 0) {
      // No documents left, create a new one
      await createNewDocument();
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('write-dark-mode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };
  const handleShareClick = async () => {
    if (!activeDoc) return;
    
    // If it's a local/guest document (not an ObjectId), save it to DB first
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(activeDoc.id);
    if (!isObjectId) {
      setChiMood({
        type: 'happy',
        comment: 'Menyiapkan dokumen untuk kolaborasi...'
      });
      await saveToDatabaseManual(activeDoc);
    }
    
    setShowShareModal(true);
  };

  return (
    <div className="write-container">
      <WriteTopBar
        activeDoc={activeDoc}
        updateDocument={updateDocument}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        showFormatBar={showFormatBar}
        setShowFormatBar={setShowFormatBar}
        setShowSettingsModal={setShowSettingsModal}
        isAdmin={isAdmin}
        userData={userData}
        saveStatus={saveStatus}
        autoSaveStatus={autoSaveStatus}
        isLoading={isLoading}
        onSave={activeDoc ? () => saveToDatabaseManual(activeDoc) : undefined}
        onShare={activeDoc?.id ? handleShareClick : undefined}
        collaboratorCount={collaboration.collaborators.filter(c => c.role !== 'pending' && c.role !== 'owner').length}
        pendingCount={collaboration.collaborators.filter(c => c.role === 'pending').length}
        activeUsers={collaboration.activeUsers}
      />

      {activeDoc?.id && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={activeDoc.id}
          settings={collaboration.settings}
          isOwner={collaboration.isOwner}
          currentUserId={userData?.id || guestData?.id}
          collaborators={collaboration.collaborators}
          onUpdateSettings={collaboration.updateSettings}
          onUpdateRole={collaboration.updateCollaboratorRole}
          onRemove={collaboration.removeCollaborator}
        />
      )}

      <div className="main">
        <WriteSidebar
          documents={documents}
          activeDocId={activeDocId}
          setActiveDocId={setActiveDocId}
          createNewDocument={createNewDocument}
          showTemplateSelector={() => setShowTemplateModal(true)}
          deleteDocument={deleteDocument}
          tokenUsage={tokenUsage}
          setShowUpgradeModal={setShowUpgradeModal}
          dailyTarget={dailyTarget}
          setDailyTarget={setDailyTarget}
        />

        <WriteEditor
          activeDoc={activeDoc}
          updateDocument={updateDocument}
          showFormatBar={showFormatBar}
          chiMood={chiMood}
          setChiMood={setChiMood}
          setShowAutoModal={setShowAutoModal}
          setShowCitationModal={setShowCitationModal}
          aiProvider={aiProvider}
          onAutoGenerate={(callback) => { autoGenerateCallbackRef.current = callback; }}
          onAutoSaveStatusChange={setAutoSaveStatus}
          onSetAIGenerating={(callback) => { aiGeneratingCallbackRef.current = callback; }}
          documentId={activeDoc?.id}
          userId={userData?.id || guestData?.id}
          userType={userData ? (userData.role === 'admin' ? 'admin' : 'customer') : 'guest'}
          userName={userData?.name || guestData?.name || 'Anonymous'}
          canComment={collaboration.settings?.allowComments && ['editor', 'commenter', 'owner'].includes(collaboration.myRole)}
          showComments={showComments}
          onToggleComments={() => setShowComments(!showComments)}
          isCollaborative={!!activeDoc?.id && collaboration.collaborators.length > 0}
          myRole={collaboration.myRole}
          onRefreshUsage={fetchCustomerPlan}
        />

        <WriteRightPanel
          activeDoc={activeDoc}
          chiMood={chiMood}
          setChiMood={setChiMood}
          collaborators={collaboration.collaborators}
          activeUsers={collaboration.activeUsers}
          isOwner={collaboration.isOwner}
          myRole={collaboration.myRole}
          onInviteClick={() => setShowShareModal(true)}
          onRemoveCollaborator={collaboration.removeCollaborator}
        />
      </div>

      <WriteModals
        showAutoModal={showAutoModal}
        setShowAutoModal={setShowAutoModal}
        showCitationModal={showCitationModal}
        setShowCitationModal={setShowCitationModal}
        showUpgradeModal={showUpgradeModal}
        setShowUpgradeModal={setShowUpgradeModal}
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        activeDoc={activeDoc}
        updateDocument={updateDocument}
        tokenUsage={tokenUsage}
        setTokenUsage={setTokenUsage}
        aiProvider={aiProvider}
        setAiProvider={setAiProvider}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        ghostEnabled={ghostEnabled}
        setGhostEnabled={setGhostEnabled}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        onAutoGenerate={(content, topic) => autoGenerateCallbackRef.current?.(content, topic)}
        aiGeneratingRef={aiGeneratingCallbackRef}
      />

      <ToastContainer />

      <TemplateSelector
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}