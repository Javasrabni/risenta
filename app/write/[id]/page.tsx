'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WriteTopBar from '@/components/write/WriteTopBar';
import dynamic from 'next/dynamic';
const TiptapWriteEditor = dynamic(() => import('@/components/write/TiptapWriteEditor'), { ssr: false });
import WriteRightPanel from '@/components/write/WriteRightPanel';
import WriteModals from '@/components/write/WriteModals';
import ToastContainer from '@/components/write/ToastContainer';
import ShareModal from '@/components/write/ShareModal';
import { Document, TokenUsage, DailyTarget, ChiMood, DEFAULT_PAGE_SETTINGS } from '@/types/write';
import { calculateStats } from '@/lib/writeUtils';
import { clearDraft } from '@/lib/documentCache';
import { useCollaboration } from '@/hooks/useCollaboration';

export default function WriteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  // ── Auth & User State ──
  const [userData, setUserData] = useState<{ name: string; role: string; isInternalAdmin?: boolean; id?: string } | null>(null);
  const [guestData, setGuestData] = useState<{ id: string; name: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Document State ──
  const [document, setDocument] = useState<Document | null>(null);
  const [documentNotFound, setDocumentNotFound] = useState(false);

  // ── Editor State ──
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
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>({ words: 500, current: 0 });
  const [chiMood, setChiMood] = useState<ChiMood>({
    type: 'idle',
    comment: 'Siap membantu Anda menulis hari ini!',
  });
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [ghostEnabled, setGhostEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [autoSaveStatus, setAutoSaveStatus] = useState<{ isAutoSaving: boolean; lastSaved: Date | null }>({
    isAutoSaving: false,
    lastSaved: null,
  });
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const autoGenerateCallbackRef = useRef<((content: string, topic: string) => void) | null>(null);
  const aiGeneratingCallbackRef = useRef<((isGenerating: boolean) => void) | null>(null);

  // ── Apply Dark Mode ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Only load from localStorage on initial mount
    const savedTheme = localStorage.getItem('write-dark-mode');
    if (savedTheme === 'true') {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.document || !window.document.documentElement) return;

    if (darkMode) {
      window.document.documentElement.classList.add('dark');
    } else {
      window.document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Auth Check ──
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);

        // Try customer auth first
        const customerRes = await fetch('/api/customer/auth/me', { credentials: 'include' });
        const customerData = await customerRes.json();

        if (customerData.loggedIn) {
          setIsAuthenticated(true);
          setUserData({
            name: customerData.customer?.name || 'Customer',
            role: 'customer',
            id: customerData.customer?._id || customerData.customer?.customerID,
          });
          await fetchCustomerPlan();
          return;
        }

        // Try admin auth
        const adminRes = await fetch('/api/auth/me', { credentials: 'include' });
        const adminData = await adminRes.json();

        if (adminData.loggedIn) {
          setIsAuthenticated(true);
          setIsAdmin(true);
          setUserData({
            name: adminData.admin?.adm_usn || 'Admin',
            role: 'admin',
            isInternalAdmin: adminData.isInternalAdmin,
            id: adminData.admin?._id || adminData.admin?.adm_id,
          });
          return;
        }

        // Guest user
        setIsAuthenticated(false);
        let guestId = localStorage.getItem('guest_id');
        let guestName = localStorage.getItem('guest_name');
        if (!guestId) {
          guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
          guestName = 'Tamu ' + Math.floor(Math.random() * 1000);
          localStorage.setItem('guest_id', guestId);
          localStorage.setItem('guest_name', guestName);
        }
        setGuestData({ id: guestId, name: guestName || 'Tamu' });
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // ── Load Document ──
  useEffect(() => {
    if (isLoading || isAuthenticated === null) return;
    if (!documentId) return;

    const loadDocument = async () => {
      // Check if this is a local (guest) document ID format
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(documentId);

      if (!isObjectId && !isAuthenticated) {
        // Try loading from localStorage for guest
        const saved = localStorage.getItem('write-documents');
        if (saved) {
          try {
            const docs = JSON.parse(saved);
            const doc = docs.find((d: Document) => d.id === documentId);
            if (doc) {
              setDocument({
                ...doc,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt),
              });
              return;
            }
          } catch (e) {
            console.error('Error loading local document:', e);
          }
        }
        setDocumentNotFound(true);
        return;
      }

      // Load from API
      try {
        const headers: Record<string, string> = {};
        if (!isAuthenticated && guestData) {
          headers['x-guest-id'] = guestData.id;
          headers['x-guest-name'] = guestData.name;
        }

        // Pass join param to API if user arrived via shared link
        const urlParams = new URLSearchParams(window.location.search);
        const joinParam = urlParams.get('join') === 'true' ? '?join=true' : '';

        const res = await fetch(`/api/write/documents/${documentId}${joinParam}`, {
          credentials: 'include',
          headers,
        });

        if (!res.ok) {
          setDocumentNotFound(true);
          return;
        }

        const data = await res.json();
        if (data.document) {
          setDocument({
            ...data.document,
            createdAt: new Date(data.document.createdAt),
            updatedAt: new Date(data.document.updatedAt),
          });
        } else {
          setDocumentNotFound(true);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setDocumentNotFound(true);
      }
    };

    loadDocument();
  }, [documentId, isLoading, isAuthenticated, guestData?.id]);

  // ── Handle shared document auto-join ──
  useEffect(() => {
    if (!document || !documentId) return;
    const activeId = userData?.id || guestData?.id;
    if (!activeId) return;

    const handleAutoJoin = async () => {
      try {
        const headers: Record<string, string> = {};
        if (!isAuthenticated && guestData) {
          headers['x-guest-id'] = guestData.id;
          headers['x-guest-name'] = guestData.name;
        }

        const collabRes = await fetch(`/api/write/collaboration/${documentId}`, {
          credentials: 'include',
          headers,
        });

        if (!collabRes.ok) return;

        const collabData = await collabRes.json();
        const isAlreadyCollaborator = collabData.collaborators?.some(
          (c: any) => c.userId === activeId
        );
        const isOwner = collabData.isOwner;

        if (!isAlreadyCollaborator && !isOwner) {
          await fetch(`/api/write/collaboration/${documentId}/invite`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
              selfJoin: true,
              role: collabData.settings?.defaultRole || 'viewer',
            }),
          });
          collaboration.refreshCollaborators();
        }
      } catch (err) {
        console.error('Error auto-joining collaboration:', err);
      }
    };

    // Only auto-join if accessed via shared link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('join') === 'true') {
      handleAutoJoin();
    }
  }, [document, documentId, userData?.id, guestData?.id]);

  // ── Redirect if not found ──
  useEffect(() => {
    if (documentNotFound) {
      setChiMood({
        type: 'concerned',
        comment: 'Dokumen tidak ditemukan. Kembali ke daftar dokumen...',
      });
      const timeout = setTimeout(() => router.push('/write'), 2000);
      return () => clearTimeout(timeout);
    }
  }, [documentNotFound, router]);

  // ── Preferences ──
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('write-dark-mode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document?.id && window.document.documentElement.classList.add('dark-theme');
    }
    const savedTarget = localStorage.getItem('write-daily-target');
    if (savedTarget) setDailyTarget(JSON.parse(savedTarget));
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      window.document.documentElement.classList.add('dark-theme');
    } else {
      window.document.documentElement.classList.remove('dark-theme');
    }
  }, [darkMode]);

  // ── Collaboration Hook ──
  const collaboration = useCollaboration({
    documentId: documentId || '',
    userId: userData?.id || guestData?.id || '',
    userType: userData ? (userData.role === 'admin' ? 'admin' : 'customer') : 'guest',
    userName: userData?.name || guestData?.name || 'Anonymous',
    enabled: !!(documentId && (userData?.id || guestData?.id)),
  });

  // ── Fetch Customer Plan ──
  const fetchCustomerPlan = async () => {
    try {
      const response = await fetch('/api/customer/plan', { credentials: 'include' });
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

  // ── Update Document ──
  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocument(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, ...updates, updatedAt: new Date() };
    });
    setSaveStatus('unsaved');
  }, []);

  // ── Save to DB ──
  const saveToDatabaseManual = useCallback(async (doc?: Document | null) => {
    const activeId = userData?.id || guestData?.id;
    if (!activeId) return;

    const docToSave = doc || document;
    if (!docToSave) return;

    // Guest: save to localStorage
    if (!isAuthenticated) {
      const saved = localStorage.getItem('write-documents');
      const docs = saved ? JSON.parse(saved) : [];
      const idx = docs.findIndex((d: Document) => d.id === docToSave.id);
      if (idx >= 0) {
        docs[idx] = docToSave;
      } else {
        docs.push(docToSave);
      }
      localStorage.setItem('write-documents', JSON.stringify(docs));
      setSaveStatus('saved');
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
      if (data.document) {
        setDocument(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            ...data.document,
            createdAt: new Date(data.document.createdAt),
            updatedAt: new Date(data.document.updatedAt),
          };
        });
      }
      clearDraft(docToSave.id);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus('unsaved');
    }
  }, [isAuthenticated, document, userData?.id, guestData]);

  // ── Ctrl+S ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToDatabaseManual();
      }
    };
    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [saveToDatabaseManual]);

  // ── Dark Mode Toggle ──
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('write-dark-mode', String(newMode));
  };

  // ── Share Click ──
  const handleShareClick = async () => {
    if (!document) return;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(document.id);
    if (!isObjectId) {
      await saveToDatabaseManual(document);
    }
    setShowShareModal(true);
  };

  // ── Loading / Not Found States ──
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-write-bg items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-write-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-write-text3 text-[14px]">Memuat dokumen...</p>
        </div>
      </div>
    );
  }

  if (documentNotFound) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-write-bg items-center justify-center">
        <div className="text-center">
          <p className="text-[48px] mb-4">📄</p>
          <h2 className="text-write-text mb-2 text-[20px] font-bold">Dokumen tidak ditemukan</h2>
          <p className="text-write-text3 text-[14px] mb-6">
            Dokumen ini mungkin telah dihapus atau Anda tidak memiliki akses.
          </p>
          <button 
            className="px-6 py-2.5 rounded-md text-[14px] font-bold bg-write-blue text-white hover:bg-write-blue2 transition-all shadow-sm cursor-pointer" 
            onClick={() => router.push('/write')}
          >
            ← Kembali ke Dokumen
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-write-bg items-center justify-center">
        <div className="w-6 h-6 border-2 border-write-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-write-bg">
      <WriteTopBar
        activeDoc={document}
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
        isLoading={false}
        onSave={() => saveToDatabaseManual()}
        onShare={handleShareClick}
        collaboratorCount={collaboration.collaborators.filter(c => (c.role as string) !== 'pending' && (c.role as string) !== 'owner').length}
        pendingCount={collaboration.collaborators.filter(c => (c.role as string) === 'pending').length}
        activeUsers={activeUsers}
        mode="editor"
        onBack={() => router.push('/write')}
      />

      {document.id && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={document.id}
          settings={collaboration.settings}
          isOwner={collaboration.isOwner}
          currentUserId={userData?.id || guestData?.id}
          collaborators={collaboration.collaborators}
          onUpdateSettings={collaboration.updateSettings}
          onUpdateRole={collaboration.updateCollaboratorRole}
          onRemove={collaboration.removeCollaborator}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <TiptapWriteEditor
          activeDoc={document}
          updateDocument={updateDocument}
          isCollaborative={collaboration.collaborators.length > 0}
          documentId={document.id}
          aiProvider={aiProvider}
          userId={userData?.id || guestData?.id}
          userType={userData ? (userData.role === 'admin' ? 'admin' : 'customer') : 'guest'}
          userName={userData?.name || guestData?.name || 'Anonymous'}
          canComment={collaboration.settings?.allowComments && ['editor', 'commenter', 'owner'].includes(collaboration.myRole)}
          showComments={showComments}
          onToggleComments={() => setShowComments(!showComments)}
          onAutoGenerate={(callback) => { autoGenerateCallbackRef.current = callback; }}
          onSetAIGenerating={(callback) => { aiGeneratingCallbackRef.current = callback; }}
          myRole={collaboration.myRole as any}
          onRefreshUsage={fetchCustomerPlan}
          tokenUsage={tokenUsage}
          onActiveUsersChange={setActiveUsers}
        />

        <WriteRightPanel
          activeDoc={document}
          chiMood={chiMood}
          setChiMood={setChiMood}
          collaborators={collaboration.collaborators}
          activeUsers={[]}
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
        activeDoc={document}
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
    </div>
  );
}
